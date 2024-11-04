require("dotenv").config()

const {Connection, PublicKey, Keypair}=require("@solana/web3.js")
const fs=require('fs')
const path=require('path')
const WebSocket = require('ws');
const { pumpfunSwapTransactionFaster, swapTokenAccounts, swapPumpfunFaster, swapTokenFastest, swapTokenFastestWallet, pumpfunSwapTransactionFasterWallet, swapTokenAccountsWallet, swapPumpfunFasterWallet, pumpfunSwapTransactionFasterWalletToken, pumpfunSwapTransactionFasterWalletStaked, swapPumpfunFasterWalletStaked } = require("./swap");
const { getAssociatedTokenAddressSync } = require("@solana/spl-token");

const { getSwapMarket, getSwapMarketFaster } = require("./utils");
const Client=require("@triton-one/yellowstone-grpc");
const bs58=require("bs58")

if(!fs.existsSync(path.resolve(__dirname,"wallets"))){
    fs.mkdirSync(path.resolve(__dirname,"wallets"))
}

var wallets=fs.readdirSync(path.resolve(__dirname,"wallets"));
setInterval(() => {
    wallets=fs.readdirSync(path.resolve(__dirname,"wallets"));
}, 1000);

const connection=new Connection(process.env.RPC_API);
const stakedConnectioon=new Connection(process.env.STAKED_RPC)

const PUMPFUN_RAYDIUM_MIGRATION="39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg"
const RAYDIUM_OPENBOOK_AMM="675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
const PUMPFUN_BONDINGCURVE="6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';
const RAYDIUM_AUTHORITY="5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";
const BSD_CONTRACT="BSfD6SHZigAfDWSjzD5Q41jw8LmKwtmjskPH9XW1mrRW"
const MINT_CONTRACT="minTcHYRLVPubRK8nt6sqe2ZpWrGDLQoNLipDJCGocY"

const PRIVATE_KEY =new  Uint8Array(JSON.parse(process.env.PRIVATE_KEY));
const wallet = Keypair.fromSecretKey(PRIVATE_KEY);



function connectGeyser(){
    const client =new Client.default("http://grpc.solanavibestation.com:10000/",undefined,undefined);
    client.getVersion()
    .then(async version=>{
        try {
            console.log(version)
            const request =Client.SubscribeRequest.fromJSON({
                accounts: {},
                slots: {},
                transactions: {
                    pumpfun: {
                        vote: false,
                        failed: false,
                        signature: undefined,
                        accountInclude: [PUMPFUN_BONDINGCURVE, RAYDIUM_OPENBOOK_AMM,BSD_CONTRACT],
                        accountExclude: [],
                        accountRequired: [],
                    },
                },
                transactionsStatus: {},
                entry: {},
                blocks: {},
                blocksMeta: {},
                accountsDataSlice: [],
                ping: undefined,
                commitment: Client.CommitmentLevel.PROCESSED
            })
        
            const stream =await client.subscribe();
            stream.on("data", async (data) => {
                if(data.transaction&&data.transaction.transaction&&data.transaction.transaction.signature) {
                    const transaction=data.transaction.transaction;
                    const sig=bs58.encode(data.transaction.transaction.signature)
                    

                    if(!detected) return;
                    const signers=[allAccounts[0]]
                    if(transaction.meta.logMessages.some(log=>log.includes("Program log: Instruction: InitializeMint2"))){
                        const allAccounts=[];
                        var detected=false;
                        transaction.transaction.message.accountKeys.map((account,index)=>{
                            if(!account) return;
                            const accountID=bs58.encode(account);
                            if((!detected)&&wallets.includes(accountID)) detected=true;
                            allAccounts.push(accountID);
                        })
                        transaction.meta.loadedWritableAddresses.map((account,index)=>{
                            if(!account) return;
                            const accountID=bs58.encode(account);
                            allAccounts.push(accountID);
                        })
                        transaction.meta.loadedReadonlyAddresses.map((account,index)=>{
                            if(!account) return;
                            const accountID=bs58.encode(account);
                            allAccounts.push(accountID);
                        })
                        console.log(`https://solscan.io/tx/${signature}`)
                        console.log(allAccounts)
                    }

                }
            });
            await new Promise((resolve, reject) => {
                stream.write(request, (err) => {
                    if (err === null || err === undefined) {
                    resolve();
                    } else {
                    reject(err);
                    }
                });
            }).catch((reason) => {
                console.error(reason);
                throw reason;
            });
        } catch (error) {
            console.log(error)
            console.log("RECONNECTING!!!")
            setTimeout(() => {
                connectGeyser()
            }, 2000);
            
        }

    });
}

connectGeyser()