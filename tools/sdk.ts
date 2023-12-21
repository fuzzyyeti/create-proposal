import {Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction} from "@solana/web3.js";

export async function sendTransaction(connection: Connection, instructions: TransactionInstruction[], signers: Keypair[], feePayer: Keypair) {
    let transaction = new Transaction({ feePayer: feePayer.publicKey })
    transaction.add(...instructions)
    const blockHashInfo = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockHashInfo.blockhash;
    transaction.lastValidBlockHeight = blockHashInfo.lastValidBlockHeight;
    signers.push(feePayer);
    transaction.sign(...signers);
    const txBuffer = transaction.serialize();
    // console.log("txBuffer", txBuffer.toString('base64'));
    let tx = await connection.sendTransaction(transaction, signers)

    await connection.confirmTransaction(tx);
}

export async function requestAirdrop(connection: Connection, walletPk: PublicKey) {
    const airdropSignature = await connection.requestAirdrop(
        walletPk,
        LAMPORTS_PER_SOL,
    );

    await connection.confirmTransaction(airdropSignature);
}
