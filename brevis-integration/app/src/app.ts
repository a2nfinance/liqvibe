import { Brevis, Prover, ProofRequest, StorageData, ErrCode } from 'brevis-sdk-typescript';
import { ethers, Wallet } from 'ethers';
import brevisRequestJsonABI from "./abis/brevisRequest.json";
import dotenv from "dotenv"
dotenv.config();

const prover = new Prover('localhost:33247');
const brevis = new Brevis('appsdkv2.brevis.network:9094');

const mainetProvider = new ethers.providers.JsonRpcProvider("https://eth.llamarpc.com");
const testnetProvider = new ethers.providers.JsonRpcProvider("https://1rpc.io/sepolia");
const usdtWethPancakeV3PoolAddress = "0x1ac1a8feaaea1900c4166deeed0c11cc10669d36";
const brevisRequestContractAddress = "0x841ce48F9446C8E281D3F1444cB859b4A6D0738C"
const brevisRequestContract = new ethers.Contract(brevisRequestContractAddress, brevisRequestJsonABI, testnetProvider);

const mainnetChainId = 1;
const testnetChainId = 11155111;
const numberOfDataItems = 5;
const callbackHookAddress = "";

const accountPrivateKey = process.env.ACCOUNT_PRIVATE_KEY;

interface SubmitResponse {
    queryKey: any; // Must be QueryKey
    fee: string;
}

const getDataAtBlockNumber = async (blockNumber: number, contractAddress: string, storageIndex: number, provider: ethers.providers.JsonRpcProvider) => {
    const storageVal = await provider.getStorageAt(contractAddress, storageIndex, blockNumber);

    const storageData = new StorageData({
        block_num: blockNumber,
        address: contractAddress,
        slot: "0x0000000000000000000000000000000000000000000000000000000000000000",
        value: storageVal
    })
    console.log(blockNumber, storageVal)

    return storageData
}

const getDataList = async (numberOfItem: number, startingBlockNumber: number, contractAddress: string, index: number, provider: ethers.providers.JsonRpcProvider) => {
    var list = []

    var currentBlock = startingBlockNumber;

    // repeat until we meet the requested data points
    while (list.length < numberOfItem) {
        // fetch brevis structured data
        const item = await getDataAtBlockNumber(currentBlock, contractAddress, index, provider);
        // append new item
        list.push(item)
        // move to next block
        currentBlock--;
    }
    console.log("List of storage data:", list);
    return list;
}

const getAccountAddress = async (privKey: string) => {
    // get the sender address
    let wallet = new Wallet(privKey, testnetProvider);
    let accountAddress = await wallet.getAddress();
    return accountAddress;
}
// const formatBrevisData = async (brevisRes: SubmitResponse, refundee: string, callback: string) => {
//     // encode data to submit on-chain
//     const data = await brevisRequestContract.functions.sendRequest(brevisRes.queryKey, refundee, callback);
//     return data
// }

const sendRequest = async (provider: ethers.providers.JsonRpcProvider, prover: Prover, brevis: Brevis) => {

    const proofReq = new ProofRequest();
    let latestBlock = await provider.getBlockNumber();
    console.log(latestBlock);
    const storageDataList = await getDataList(
        numberOfDataItems,
        latestBlock - 1,
        usdtWethPancakeV3PoolAddress,
        0,
        provider
    )

    for (let i = 0; i < storageDataList.length; i++) {
        proofReq.addStorage(storageDataList[i], i)
    }

    console.log("going to prove")

    const proofRes = await prover.prove(proofReq);

    // error handling
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
    console.log('proof', proofRes.proof);

    try {
        const brevisRes: SubmitResponse = await brevis.submit(
            proofReq,
            proofRes,
            mainnetChainId,
            testnetChainId,
            // ZK-MODE
            0,
            // TESTNET so api key is null
            "",
            callbackHookAddress
        );
        console.log('brevis res', brevisRes);

        //const refundee = await getAccountAddress(accountPrivateKey);

        //var brevisDataToSend = await formatBrevisData(brevisRes, refundee, callbackHookAddress);
        //console.log(refundee, brevisRequestContractAddress, brevisDataToSend, accountPrivateKey)

        // await sendTransaction(refundee, brevisRequestContractAddress, brevisDataToSend, accountPrivateKey)

        await brevis.wait(brevisRes.queryKey, testnetChainId);
    } catch (err) {
        console.error(err);
    }
}


async function main() {
    let latestBlock = await mainetProvider.getBlockNumber();
    console.log(latestBlock);
    let dataList = await getDataList(numberOfDataItems, latestBlock - 1, usdtWethPancakeV3PoolAddress, 0, mainetProvider);
}

main();
