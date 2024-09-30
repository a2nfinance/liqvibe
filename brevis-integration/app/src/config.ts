import dotenv from "dotenv";
import { ethers } from "ethers";
dotenv.config();


const mainnetRpcBlockIo = `https://go.getblock.io/${process.env.GET_BLOCK_MAINNET_ACCESS_TOKEN}`;
let mainnetProvider = new ethers.providers.JsonRpcProvider(mainnetRpcBlockIo);

const sepoliaRpcBlockIo = `https://go.getblock.io/${process.env.GET_BLOCK_SEPOLIA_ACCESS_TOKEN}`;
let sepoliaProvider = new ethers.providers.JsonRpcProvider(sepoliaRpcBlockIo);


const bscMainnetRpcBlockIo = `https://go.getblock.io/${process.env.GET_BLOCK_BSC_MAINNET_ACCESS_TOKEN}`;
let bscMainnetProvider = new ethers.providers.JsonRpcProvider(bscMainnetRpcBlockIo);


const bscTestnetRpcBlockIo = `https://go.getblock.io/${process.env.GET_BLOCK_BSC_TESNET_ACCESS_TOKEN}`;
let bscTestnetProvider = new ethers.providers.JsonRpcProvider(bscTestnetRpcBlockIo);

export const config = {
    // Your account private key for  calling the sendRequest function of BrevisRequest contract
    accountPrivateKey: process.env.ACCOUNT_PRIVATE_KEY,
    // Value: 0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83
    pancakeV3SwapEventId: ethers.utils.id("Swap(address,address,int256,int256,uint160,uint128,int24,uint128,uint128)"),
    // value: 0x04206ad2b7c0f463bff3dd4f33c5735b0f2957a351e4f79763a4fa9e775dd237
    pancakeV4SwapEventId: ethers.utils.id("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24,uint16)"),
    bsc: {
        mainnet: {
            pancakeV4CLPoolManagerAddress: "",
            brevisRequestContractAddress: "",
            callbackHookAddress: "",
            provider: bscMainnetProvider,
            pancakeV3PoolAddress: "0x85FAac652b707FDf6907EF726751087F9E0b6687",
            chainId: 56
        },
        testnet: {
            pancakeV4CLPoolManagerAddress: "0x969D90aC74A1a5228b66440f8C8326a8dA47A5F9",
            brevisRequestContractAddress: "0xF7E9CB6b7A157c14BCB6E6bcf63c1C7c92E952f5",
            callbackHookAddress: "0xd7e3E9EDd7f363A6649e78957edaA0B0a3482B11",
            provider: bscTestnetProvider,
            pancakeV3PoolAddress: "0x35148b7baf354585a8f3283908bAECf9d14e24b6",
            chainId: 97
        }
    },
    eth: {
        mainnet: {
            pancakeV4CLPoolManagerAddress: "",
            brevisRequestContractAddress: "",
            callbackHookAddress: "",
            provider: mainnetProvider,
            pancakeV3PoolAddress: "0x6ca298d2983ab03aa1da7679389d955a4efee15c",
            chainId: 1
        },
        testnet: {
            pancakeV4CLPoolManagerAddress: "",
            brevisRequestContractAddress: "",
            callbackHookAddress: "",
            provider: sepoliaProvider,
            pancakeV3PoolAddress: "0x35148b7baf354585a8f3283908bAECf9d14e24b6",
            chainId: 11155111
        }
    },
   
}
