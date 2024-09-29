import { Brevis, ErrCode, Field, ProofRequest, Prover, ReceiptData, StorageData } from 'brevis-sdk-typescript';
import dotenv from "dotenv";
import { ethers, Wallet } from 'ethers';
import brevisRequestJsonABI from "./abis/brevisRequest.json";
import pancakePoolV3JsonABI from "./abis/pancakePoolV3.json";
import pancakeCLPoolManagerJsonABI from "./abis/pancakeCLPoolManger.json";
dotenv.config();

const prover = new Prover('localhost:33247');
const brevis = new Brevis('appsdkv2.brevis.network:9094');

// Ethereum mainnet
// const getBlockMainnetAccessToken = process.env.GET_BLOCK_MAINNET_ACCESS_TOKEN;
// const mainnetRPCBlockIo = `https://go.getblock.io/${getBlockMainnetAccessToken}`;
// const mainetProvider = new ethers.providers.JsonRpcProvider(mainnetRPCBlockIo);
// const tokenPairPancakeV3PoolAddressMainet = "0x6ca298d2983ab03aa1da7679389d955a4efee15c";
// const mainnetChainId = 1;

// Sepolia
// const getBlockSepoliaAccessToken = process.env.GET_BLOCK_SEPOLIA_ACCESS_TOKEN;
// const sepoliaRPCBlockIo = `https://go.getblock.io/${getBlockSepoliaAccessToken}`;
// const testnetProvider = new ethers.providers.JsonRpcProvider(sepoliaRPCBlockIo);
// const tokenPairPancakeV3PoolAddress = "0x35148b7baf354585a8f3283908bAECf9d14e24b6";
// const testnetChainId = 11155111;

// BSC mainnet
const getBlockBSCMainnetAccessToken = process.env.GET_BLOCK_BSC_MAINNET_ACCESS_TOKEN;
const bscMainnetRPCBlockIo = `https://go.getblock.io/${getBlockBSCMainnetAccessToken}`;
const mainetProvider = new ethers.providers.JsonRpcProvider(bscMainnetRPCBlockIo);
const tokenPairPancakeV3PoolAddressMainet = "0x85FAac652b707FDf6907EF726751087F9E0b6687";
const mainnetChainId = 56;

// BSC testnet
const getBlockBSCTestnetAccessToken = process.env.GET_BLOCK_BSC_TESNET_ACCESS_TOKEN;
const bscTestnetRPCBlockIo = `https://go.getblock.io/${getBlockBSCTestnetAccessToken}`;
const testnetProvider = new ethers.providers.JsonRpcProvider(bscTestnetRPCBlockIo);
const tokenPairPancakeV3PoolAddress = "0x35148b7baf354585a8f3283908bAECf9d14e24b6";
const testnetChainId = 97;

// Contract addresses
const brevisRequestContractAddress = "0xF7E9CB6b7A157c14BCB6E6bcf63c1C7c92E952f5"; // BrevisRequest contract on BSC testnet
const callbackHookAddress = "0xd7e3E9EDd7f363A6649e78957edaA0B0a3482B11"; // CLVolatilePeriodRewardHookZK
const pancakeV4CLPoolManagerAddress = "0x969D90aC74A1a5228b66440f8C8326a8dA47A5F9";

const accountPrivateKey = process.env.ACCOUNT_PRIVATE_KEY; // Your account private key for  calling the sendRequest function of BrevisRequest contract


// Init read and write contract
const wallet = new Wallet(accountPrivateKey!, testnetProvider);
const brevisRequestReadContract = new ethers.Contract(brevisRequestContractAddress, brevisRequestJsonABI, testnetProvider);
const brevisRequestWriteContract = brevisRequestReadContract.connect(wallet);

// Logs settings
const step = 2;
const latestBlockNumberOfEvent = 42669436 - 800;

interface SubmitResponse {
    queryKey: any; // Must be QueryKey
    fee: string;
}

async function getAccount() {
    let address = await wallet.getAddress();
    return address;
}

// Value: 0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83
const pancakeV3SwapEventId = ethers.utils.id("Swap(address,address,int256,int256,uint160,uint128,int24,uint128,uint128)");

// value: 0x04206ad2b7c0f463bff3dd4f33c5735b0f2957a351e4f79763a4fa9e775dd237
const pancakeV4SwapEventId = ethers.utils.id("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24,uint16)");

const pancakeV3TransferEventId = ethers.utils.id("Transfer(address,address to,uint256)");

// If you pay
async function callSendRequest(provider: ethers.providers.JsonRpcProvider, brevisRes: SubmitResponse, refundee: string, queryOption: number) {
    let nonce = await wallet.getTransactionCount();
    const txUnsigned = await brevisRequestWriteContract.sendRequest(
        brevisRes.queryKey.query_hash,
        brevisRes.queryKey.nonce,
        refundee,
        [
            callbackHookAddress,
            parseInt(brevisRes.fee)
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
    const eventId = useV4 ? pancakeV4SwapEventId : pancakeV3SwapEventId;
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
    // To avoid getting empty data from recent block numbers.
    // Use block number of the latest event.

    const receiptDataList = await getDataList(
        latestBlockNumberOfEvent,
        tokenPairPancakeV3PoolAddressMainet,
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
            mainnetChainId,
            testnetChainId,
            // ZK-MODE
            queryOption,
            // No need API key for BSC testnet.
            "",
            // You hook callback address
            ""
        );

        console.log("Step 4: Pay for sending request");
        // We use destination chain ID is testnet, so we must pay 0.0001 main token to fullfilled the request on testnet 
        await callSendRequest(testnetProvider, brevisRes, refundee, queryOption);
        // Waiting for the result
        // The system do two steps:
        // - Checking sendRequest function is called.
        // - Waiting for the final TX. If there is no final transaction found, please contact Brevis on Brevis' telegram channel.
        let waitRes = await brevis.wait(brevisRes.queryKey, testnetChainId);
        if (waitRes.success) {
            console.log('Brevis res', brevisRes);
            console.log('Final tx', waitRes.tx);
        }
    } catch (err) {
        console.error(err);
    }
}


async function main(useLoop: boolean) {
    if (useLoop) {
        while (1) {
            await sendRequest(mainetProvider, prover, brevis)
            // Next process will do after 10 minutes.
            await new Promise(r => setTimeout(r, 10 * 60 * 1000));
        }
    }
    sendRequest(mainetProvider, prover, brevis);

}

main(false);
