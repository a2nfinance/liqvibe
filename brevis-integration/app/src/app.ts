import { Brevis, Prover, ProofRequest, StorageData, ErrCode } from 'brevis-sdk-typescript';
import { ethers, Wallet } from 'ethers';
import brevisRequestJsonABI from "./abis/brevisRequest.json";
import dotenv from "dotenv"
dotenv.config();

const prover = new Prover('localhost:33247');
const brevis = new Brevis('appsdkv2.brevis.network:9094');

// const mainetProvider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed1.binance.org/");
const mainetProvider = new ethers.providers.JsonRpcProvider("https://eth.llamarpc.com");
const testnetProvider = new ethers.providers.JsonRpcProvider("https://rpc.sepolia.org");
// const usdcWBNBPancakeV3PoolAddress = "0xf2688fb5b81049dfb7703ada5e770543770612c4";
const tokenPairPancakeV3PoolAddress = "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640";
// const usdcWBNBPancakeV3PoolAddress = "0x35148b7baf354585a8f3283908bAECf9d14e24b6";
const brevisRequestContractAddress = "0xF7E9CB6b7A157c14BCB6E6bcf63c1C7c92E952f5";

const accountPrivateKey = process.env.ACCOUNT_PRIVATE_KEY;

const wallet = new Wallet(accountPrivateKey!, testnetProvider);
const brevisRequestContract = new ethers.Contract(brevisRequestContractAddress, brevisRequestJsonABI, testnetProvider);
const writeContract = brevisRequestContract.connect(wallet);

const mainnetChainId = 1;
const testnetChainId = 11155111;
const numberOfDataItems = 10;
const step = 20;
const callbackHookAddress = "0xb658B88DB306B7E8F8C22eC09F05f8aB3453bDc3";


interface SubmitResponse {
    queryKey: any; // Must be QueryKey
    fee: string;
}

async function getAccount() {
    // get the sender address
    let address = await wallet.getAddress();
    return address;
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// function formatBrevisData(brevisRes: SubmitResponse, refundee: string, callback: string){
//     // encode data to submit on-chain
//     const data = brevisRequestContract.methods.sendRequest(
//         brevisRes.brevisId, refundee, callback
//     ).encodeABI();
//     return data
// }

// async function sendTransaction(from: string, to: string, givenData: string, privKey: string){
//     // sign the transaction
//     const wallet = new Wallet(privKey, testnetProvider);
//     // var signedTx = await wallet.signTransaction(
//     //     {
//     //         from: from,
//     //         to: to,
//     //         value: 0,
//     //         maxFeePerGas: 3000000000,
//     //         maxPriorityFeePerGas: 2000000000,
//     //         data: givenData
//     //     });

//     // send it
//     var receipt = await wallet.sendTransaction({
//         from: from,
//         to: to,
//         value: 0,
//         maxFeePerGas: 3000000000,
//         maxPriorityFeePerGas: 2000000000,
//         data: givenData
//     });

//     console.log(receipt);
// }

const getDataAtBlockNumber = async (blockNumber: number, contractAddress: string, storageIndex: number, provider: ethers.providers.JsonRpcProvider) => {
    const storageVal = await provider.getStorageAt(contractAddress, storageIndex, blockNumber);

    const storageData = new StorageData({
        block_num: blockNumber,
        address: contractAddress,
        slot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        value: storageVal
    })
    console.log(blockNumber, storageVal)

    return storageData
}

const getDataList = async (numberOfItem: number, startingBlockNumber: number, contractAddress: string, index: number, provider: ethers.providers.JsonRpcProvider) => {
    let list = []

    let currentBlock = startingBlockNumber;

    // repeat until we meet the requested data points
    while (list.length < numberOfItem) {
        // fetch brevis structured data
        const item = await getDataAtBlockNumber(currentBlock, contractAddress, index, provider);
        // append new item
        list.push(item)
        // move to previous block with step.
        currentBlock = currentBlock - step;
    }
    return list;
}


const sendRequest = async (provider: ethers.providers.JsonRpcProvider, prover: Prover, brevis: Brevis) => {

    const proofReq = new ProofRequest();
    let latestBlock = await provider.getBlockNumber();
    console.log(latestBlock);
    const storageDataList = await getDataList(
        numberOfDataItems,
        latestBlock - 1,
        tokenPairPancakeV3PoolAddress,
        0,
        provider
    )

    for (let i = 0; i < storageDataList.length; i++) {
        proofReq.addStorage(storageDataList[i], i)
    }

    try {

        console.log("going to prove")
        const proofRes = await prover.prove(proofReq);
        console.log(proofRes.proof);
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

        // console.log('proof id', proveRes.proof_id);
        // const prepRes = await brevis.prepareQuery(proofReq, proveRes.circuit_info, mainnetChainId, testnetChainId, 1, "", callbackHookAddress)
        // console.log('brevis query key', JSON.stringify(prepRes.query_key));

        // let proof = '';
        // for (let i = 0; i < 100; i++) {
        //     const getProofRes = await prover.getProof(proveRes.proof_id);
        //     if (getProofRes.has_err) {
        //         console.error(proveRes.err.msg);
        //         return;
        //     }
        //     if (getProofRes.proof) {
        //         proof = getProofRes.proof;
        //         console.log('proof', proof);
        //         break;
        //     }
        //     console.log('waiting for proof...');
        //     await sleep(3000);
        // }

        // await brevis.submitProof(prepRes.query_key, testnetChainId, proof);
        // console.log('proof submitted to brevis');
        // const brevisRes: SubmitResponse = await brevis.submit(
        //     proofReq,
        //     proofRes,
        //     mainnetChainId,
        //     testnetChainId,
        //     // ZK-MODE
        //     0,
        //     // TESTNET so api key is null
        //     "",
        //     ""
        // );
        // console.log('brevis res', brevisRes);
        // const refundee = await getAccount();

        // let res = await brevisRequestContract.requests("0x222764fc65947827559bfb2a486e07356e1b71b173f0c010dfe04fd72cd94d6c");
        // console.log(res);
        // let sendReq = await writeContract.sendRequest(
        //     "0x222764fc65947827559bfb2a486e07356e1b71b173f0c010dfe04fd72cd94d6c",
        //     1727380202,
        //     refundee,
        //     [
        //         callbackHookAddress,
        //         200000

        //     ],
        //     1,
        //     {
        //         value: ethers.utils.parseEther("0.0001")
        //     }

        // );
        // console.log(sendReq);
        // const receipt = await sendReq.wait();
        // let tx = await wallet.sendTransaction({
        //     from: refundee,
        //     chainId: 97,
        //     to: brevisRequestContractAddress,
        //     data: sendReq.data,
        //     // maxFeePerGas: 3000000000,
        //     // maxPriorityFeePerGas: 2000000000,
        //     value: 0,
        //     // nonce: 3
        // })
        // console.log(tx);
        // var brevisDataToSend = (formatBrevisData(brevisRes, refundee, callbackHookAddress))
        // console.log(refundee, brevisRequestContractAddress, brevisDataToSend, )

        // await sendTransaction(refundee, brevisRequestContractAddress, brevisDataToSend, accountPrivateKey!)
        // console.log("Send Request success:", receipt);
        let waitRes = await brevis.wait(brevisRes.queryKey, testnetChainId);
        if (waitRes.success) {
            console.log('final tx', waitRes.tx);
        }
    } catch (err) {
        console.error(err);
    }
}


async function main() {
    // let latestBlock = await mainetProvider.getBlockNumber();
    // console.log(latestBlock);
    // let dataList = await getDataList(numberOfDataItems, latestBlock - 1, usdcWBNBPancakeV3PoolAddress, 0, mainetProvider);
    sendRequest(mainetProvider, prover, brevis);

}

main();
