import {PublicKey, TransactionInstruction} from "@solana/web3.js";
import {TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID} from "@solana/spl-token";


export const withCreateAssociatedTokenAccount = async (
    instructions: TransactionInstruction[],
    mintPk: PublicKey,
    ownerPk: PublicKey,
    payerPk: PublicKey
) => {
    const ataPk = await getAssociatedTokenAddressSync(
        mintPk,
        ownerPk // owner
    )

    instructions.push(
        createAssociatedTokenAccountInstruction(
            payerPk,
            ataPk,
            ownerPk,
            mintPk,
        )
    )

    return ataPk
}
