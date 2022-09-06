const SHA256 = require('crypto-js/sha256');
const Block = require('./block');

// configure simpleChain.js with levelDB to persist blockchain dataset using the level Node.js library.
 
const db = require('level')('./chaindata');

class Blockchain {
    constructor() {
        // genesis block persist as the first block in the blockchain using LevelDB.
        this.getBlockHeight().then((height) => {
            if (height === -1) {
            this.addBlock(new Block("Genesis block")).then(() => console.log("Genesis block added!"));
            }
        });
    }

    /**
     * addBlock(newBlock) function includes a method to store newBlock with LevelDB.
     * @param {Block} newBlock 
     */
    async addBlock(newBlock) {
        const height = parseInt(await this.getBlockHeight());

        newBlock.height = height + 1;
        newBlock.time = new Date().getTime().toString().slice(0, -3);

        if (newBlock.height > 0) {
            const prevBlock = await this.getBlock(height);
            newBlock.previousBlockHash = prevBlock.hash;
            console.log(`Previous hash: ${newBlock.previousBlockHash}`);
        }

        newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
        console.log(`New hash: ${newBlock.hash}`);

        await this.addBlockToDB(newBlock.height, JSON.stringify(newBlock));
    }

    /**
     * modify getBlockHeight() function to retrieve current block height within the LevelDB chain.
     */
    async getBlockHeight() {
        return await this.getBlockHeightFromDB();
    }

    /**
     * modify getBlock() function to retrieve a block by it's block heigh within the LevelDB chain.
     * @param {int} blockHeight 
     */
    async getBlock(blockHeight) {
        return JSON.parse(await this.getBlockFromDB(blockHeight));
    }

    /**
     * modify the validateBlock() function to validate a block stored within levelDB.
     * @param {int} blockHeight 
     */
    async validateBlock(blockHeight) {
        let block = await this.getBlock(blockHeight);
        let blockHash = block.hash;
        block.hash = '';

        let validBlockHash = SHA256(JSON.stringify(block)).toString();

        if (blockHash === validBlockHash) {
            return true;
        } else {
            console.log(`Block #${blockHeight} invalid hash: ${blockHash} <> ${validBlockHash}`);
            return false;
        }
    }

    // modify the validateChain() function to validate blockchain stored within levelDB.
    async validateChain() {
        let errorLog = [];
        let previousHash = '';
        let isValidBlock = false;

        const heigh = await this.getBlockHeightFromDB();

        for (let i = 0; i < heigh; i++) {
            this.getBlock(i).then((block) => {
                isValidBlock = this.validateBlock(block.height);

                if (!isValidBlock) {
                    errorLog.push(i);
                } 

                if (block.previousBlockHash !== previousHash) {
                    errorLog.push(i);
                }

                previousHash = block.hash;

                if (i === (heigh -1)) {
                    if (errorLog.length > 0) {
                        console.log(`[ERROR]Block errors = ${errorLog.length}`);
                        console.log(`[ERROR]Blocks: ${errorLog}`);
                    } else {
                        console.log('[INFO]No errors detected...');
                    }
                }
            })
        }
    }

    // level db functions

    addBlockToDB(key, value) {
        return new Promise((resolve, reject) => {
            db.put(key, value, (error) => {
                if (error) {
                    reject(error);
                }

                console.log(`Added block #${key}`);
                resolve(`Added block #${key}`);
            })
        })
    }

    getBlockFromDB(key) {
        return new Promise((resolve, reject) => {
            db.get(key, (error, value) => {
                if (error) {
                    reject(error);
                }
                resolve(value);
            })
        })
    }

    getBlockHeightFromDB() {
        return new Promise((resolve, reject) => {
            let height = -1;

            db.createReadStream()
                .on('data', (data) => {
                    height++;
                }).on('error', (error) => {
                    reject(error);
                }).on('close', () => {
                    resolve(height);
                })
        })
    }
}

let blockchain = new Blockchain();
console.log('[INFO]Adding elements to the blockchain...');
(function theLoop (i) {
    setTimeout(() => {
        blockchain.addBlock(new Block(`Test data ${i}`)).then(() => {
            if (--i) {
                theLoop(i);
            }
        })
    }, 100);
})(50);
setTimeout(() => {
    console.log('[INFO]Testing the chain...')
    blockchain.validateChain()
}, 2000);