import { Brevis, ErrCode, Field, ProofRequest, Prover, ReceiptData } from 'brevis-sdk-typescript';
import { ethers, Wallet } from 'ethers';
import brevisRequestJsonABI from "./abis/brevisRequest.json";
import pancakeCLPoolManagerJsonABI from "./abis/pancakeCLPoolManger.json";
import pancakePoolV3JsonABI from "./abis/pancakePoolV3.json";
import { config } from './config';



const prover = new Prover('localhost:33247');
const brevis = new Brevis('appsdkv2.brevis.network:9094');

// Init read and write contract
const wallet = new Wallet(config.accountPrivateKey!, config.bsc.testnet.provider);
const brevisRequestReadContract = new ethers.Contract(
    config.bsc.testnet.brevisRequestContractAddress,
    brevisRequestJsonABI,
    config.bsc.testnet.provider
);
const brevisRequestWriteContract = brevisRequestReadContract.connect(wallet);

// Logs settings
const step = 2;
const latestBlockNumberOfEvent = 42669436 - 800;

interface SubmitResponse {
    queryKey: any; // Must be QueryKey
    fee: string;
}

interface PrepareQueryResponse {
    query_key: any; // Must be QueryKey
    fee: string;
}

async function getAccount() {
    let address = await wallet.getAddress();
    return address;
}

// If you pay
async function callSendRequest(provider: ethers.providers.JsonRpcProvider, prepRes: PrepareQueryResponse, refundee: string, queryOption: number, proofId: string) {
    let nonce = await wallet.getTransactionCount();
    const txUnsigned = await brevisRequestWriteContract.sendRequest(
        prepRes.query_key.query_hash,
        prepRes.query_key.nonce,
        refundee,
        [
            config.bsc.testnet.callbackHookAddress,
            parseInt(prepRes.fee)
        ],
        queryOption,
        {
            value: ethers.utils.parseEther("0.0001"),
            gasLimit: 20000000,
            gasPrice: (await provider.getFeeData()).gasPrice,
            nonce: nonce
        }
    );

    let tx = await txUnsigned.wait();
    if (tx.status) {
        console.log("Send request success:", tx.transactionHash);
    } else {
        console.log("Send request fail:", tx.transactionHash);
    }
}

const getReceiptData = async (event: ethers.Event, eventId: string) => {
    let transactionReceipt: ethers.providers.TransactionReceipt = await event.getTransactionReceipt();
    let logs: ethers.providers.Log[] = transactionReceipt.logs;
    let relativeSwapIndex: number = logs.findIndex(l => l.logIndex === event.logIndex);
    let receiptData: ReceiptData = new ReceiptData({
        block_num: event.blockNumber,
        tx_hash: event.transactionHash,
        fields: [
            new Field({
                contract: event.address,
                log_index: relativeSwapIndex,
                event_id: eventId,
                is_topic: false,
                field_index: 2,
                value: event.args?.["sqrtPriceX96"]._hex
            })
        ]
    })

    console.log({
        block_num: event.blockNumber,
        tx_hash: event.transactionHash,
        fields: [
            {
                contract: event.address,
                log_index: relativeSwapIndex,
                event_id: eventId,
                is_topic: false,
                field_index: 2,
                value: event.args?.["sqrtPriceX96"]._hex
            }
        ]
    })

    return receiptData;
}

const getDataList = async (startingBlockNumber: number, contractAddress: string, provider: ethers.providers.JsonRpcProvider, useV4: boolean) => {
    let list: ReceiptData[] = []
    let currentBlock = startingBlockNumber;

    let poolContract = new ethers.Contract(contractAddress, pancakePoolV3JsonABI, provider);
    if (useV4) {
        // CLPoolManager
        poolContract = new ethers.Contract(contractAddress, pancakeCLPoolManagerJsonABI, provider);
    }
    const eventId = useV4 ? config.pancakeV4SwapEventId : config.pancakeV3SwapEventId;
    const events = await poolContract.queryFilter(
        {
            address: contractAddress,
            topics: [
                eventId
            ]
        },
        currentBlock - step,
        currentBlock
    );

    for (let i = 0; i < events.length; i++) {
        let receiptData = await getReceiptData(events[i], eventId);
        list.push(receiptData);
    }


    return list;
}


const sendRequest = async (provider: ethers.providers.JsonRpcProvider, prover: Prover, brevis: Brevis) => {
    // Use developer account as refundee account.
    // You can change this here.
    let refundee = await getAccount();
    const proofReq = new ProofRequest();
    // Brevis service gateway can throw some errors when you submit a proof,
    // please adjust blocknumber carefully.
    // Common errors: 
    // - invalid Storage Slot info
    // - unsupported blocknumber
    console.log("Step 1: Get history of the transaction logs.")
    console.log('=========================================================');
    // To avoid getting empty data from recent block numbers.
    // Use block number of the latest event.

    const receiptDataList = await getDataList(
        latestBlockNumberOfEvent,
        config.bsc.mainnet.pancakeV3PoolAddress,
        provider,
        false
    )

    // Use V4
    // const receiptDataList = await getDataList(
    //     latestBlockNumberOfEvent,
    //     pancakeV4CLPoolManagerAddress,
    //     provider,
    //     true
    // )

    if (!receiptDataList.length) {
        console.log("No data item found!");
        console.log("End process!!!");
        return;
    }

    for (let i = 0; i < receiptDataList.length; i++) {
        proofReq.addReceipt(receiptDataList[i], i)
    }
    console.log('=========================================================');

    try {
        console.log("Step 2: Going to prove")
        const proofRes = await prover.proveAsync(proofReq);

        // Checking errors after calling the prover service (localhost:33247)
        if (proofRes.has_err) {
            const err = proofRes.err;
            switch (err.code) {
                case ErrCode.ERROR_INVALID_INPUT:
                    console.error('invalid receipt/storage/transaction input:', err.msg);
                    break;

                case ErrCode.ERROR_INVALID_CUSTOM_INPUT:
                    console.error('invalid custom input:', err.msg);
                    break;

                case ErrCode.ERROR_FAILED_TO_PROVE:
                    console.error('failed to prove:', err.msg);
                    break;
            }
            return;
        }


        console.log('proof id', proofRes.proof_id);


        // 0: ZK-MODE
        // 1: OP-MODE
        // If you select queryOption = 1, please update your hook smart contracts by calling setBrevisOpConfig.
        // _challengeWindow: 0: POS (proof of stake), 2**64 - 1: disable optimistic result.
        // _sigOption: bit 0 is bvn, bit 1 is avs.
        let queryOption = 0;
        const prepRes = await brevis.prepareQuery(proofReq, proofRes.circuit_info, config.bsc.mainnet.chainId, config.bsc.testnet.chainId, queryOption, "", "");

        let proof = '';
        for (let i = 0; i < 100; i++) {
            const getProofRes = await prover.getProof(proofRes.proof_id);
            if (getProofRes.has_err) {
                console.error(proofRes.err.msg);
                return;
            }
            if (getProofRes.proof) {
                proof = getProofRes.proof;
                console.log('proof', proof);
                break;
            }
            console.log('waiting for proof...');
            await sleep(3000);
        }

        console.log("Step 3: Submit proof to the Brevis service.");


        await brevis.submitProof(prepRes.query_key, config.bsc.testnet.chainId, proof);
        console.log("Step 4: Pay for sending request");
        // We use destination chain ID is testnet, so we must pay 0.0001 main token to fullfilled the request on testnet 
        await callSendRequest(config.bsc.testnet.provider, prepRes, refundee, queryOption, proofRes.proof_id);

        console.log("Step 5: Check the query key for final transaction");
        console.log('=========================================================');
        // Waiting for the result
        // The system do two steps:
        // - Checking sendRequest function is called.
        // - Waiting for the final TX. If there is no final transaction found, please contact Brevis on Brevis' telegram channel.
        let waitRes = await brevis.wait(prepRes.query_key, config.bsc.testnet.chainId);
        if (waitRes.success) {
            console.log('=========================================================');
            console.log('Final tx', waitRes.tx);
        }
    } catch (err) {
        console.error(err);
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(useLoop: boolean) {
    if (useLoop) {
        while (1) {
            await sendRequest(config.bsc.mainnet.provider, prover, brevis)
            // Next process will do after 10 minutes.
            sleep(10 * 60 * 1000);
        }
    }
    sendRequest(config.bsc.mainnet.provider, prover, brevis);

}

main(false);
