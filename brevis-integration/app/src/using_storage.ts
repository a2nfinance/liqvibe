import { Brevis, ErrCode, ProofRequest, Prover, StorageData } from 'brevis-sdk-typescript';
import dotenv from "dotenv";
import { ethers, Wallet } from 'ethers';
import brevisRequestJsonABI from "./abis/brevisRequest.json";
import { config } from './config';
dotenv.config();

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


// Getting storage data settings.
const numberOfDataItems = 2;
const step = 5;


interface SubmitResponse {
    queryKey: any; // Must be QueryKey
    fee: string;
}

async function getAccount() {
    let address = await wallet.getAddress();
    return address;
}

async function callSendRequest(provider: ethers.providers.JsonRpcProvider, brevisRes: SubmitResponse, refundee: string, zkMode: number) {
    let nonce = await wallet.getTransactionCount();
    const txUnsigned = await brevisRequestWriteContract.sendRequest(
        brevisRes.queryKey.query_hash,
        brevisRes.queryKey.nonce,
        refundee,
        [
            config.bsc.testnet.callbackHookAddress,
            parseInt(brevisRes.fee)
        ],
        zkMode,
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

const getDataAtBlockNumber = async (blockNumber: number, contractAddress: string, storageIndex: number, provider: ethers.providers.JsonRpcProvider) => {
    // Use PancakeSwap Pool V3 smart contract.
    // Storage slot is 0.
    // To understand a storage layout of the pool V3 contract, see this link:
    // https://explorer.sim.io/eth/20846645/0x6ca298d2983ab03aa1da7679389d955a4efee15c/slot0#map
    const storageVal = await provider.getStorageAt(contractAddress, storageIndex, blockNumber);
    const storageData = new StorageData({
        block_num: blockNumber,
        address: contractAddress,
        slot: "0x0000000000000000000000000000000000000000000000000000000000000000",
        // Storage value at a storage slot.
        value: storageVal
    })

    console.log(
        {
            block_num: blockNumber,
            address: contractAddress,
            slot: "0x0000000000000000000000000000000000000000000000000000000000000000",
            value: storageVal
        }
    )
    return storageData
}

const getDataList = async (numberOfItem: number, startingBlockNumber: number, contractAddress: string, index: number, provider: ethers.providers.JsonRpcProvider) => {
    let list = []
    let currentBlock = startingBlockNumber;
    // Get all data points.
    while (list.length < numberOfItem) {
        // Brevis StorageData.
        const item = await getDataAtBlockNumber(currentBlock, contractAddress, index, provider);
        list.push(item)
        // Move to previous block with a intermittent step.
        currentBlock = currentBlock - step;
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
    console.log("Step 1: Get the history of the storage value at slot 0.")
    console.log('=========================================================');
    let latestBlock = await provider.getBlockNumber();
    const storageDataList = await getDataList(
        numberOfDataItems,
        latestBlock,
        config.bsc.mainnet.pancakeV3PoolAddress,
        0,
        provider
    )

    for (let i = 0; i < storageDataList.length; i++) {
        proofReq.addStorage(storageDataList[i], i)
    }
    console.log('=========================================================');
    try {
        console.log("Step 2: Going to prove")
        const proofRes = await prover.prove(proofReq);

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

        console.log("Step 3: Submit proof to the Brevis service.");

        // 0: ZK-MODE
        // 1: OP-MODE
        // If you select queryOption = 1, please update your hook smart contracts by calling setBrevisOpConfig.
        // _challengeWindow: 0: POS (proof of stake), 2**64 - 1: disable optimistic result.
        // _sigOption: bit 0 is bvn, bit 1 is avs.
        let queryOption = 0;
        const brevisRes: SubmitResponse = await brevis.submit(
            proofReq,
            proofRes,
            config.bsc.mainnet.chainId,
            config.bsc.testnet.chainId,
            // ZK-MODE
            queryOption,
            // No need API key for BSC testnet.
            "",
            // You hook callback address
            ""
        );

        console.log("Step 4: Pay for sending request");
        // Pay 0.0001 main token to fullfilled the request.
        await callSendRequest(provider, brevisRes, refundee, queryOption);

        console.log("Step 5: Check the query key for final transaction");
        console.log('=========================================================');
        // Waiting for the result
        // The system do two steps:
        // - Checking sendRequest function is called.
        // - Waiting for the final TX. If there is no final transaction found, please contact Brevis on Brevis' telegram channel.
        let waitRes = await brevis.wait(brevisRes.queryKey, config.bsc.testnet.chainId,);
        if (waitRes.success) {
            console.log('=========================================================');
            console.log('Final tx', waitRes.tx);
        }
    } catch (err) {
        console.error(err);
    }
}


async function main(useLoop: boolean) {
    if (useLoop) {
        while (1) {
            await sendRequest(config.bsc.mainnet.provider, prover, brevis)
            // Next process will do after 10 minutes.
            await new Promise(r => setTimeout(r, 10 * 60 * 1000));
        }
    }
    sendRequest(config.bsc.mainnet.provider, prover, brevis);

}

main(false);
