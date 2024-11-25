import {
    createInstructionData, getProposal,
    getProposalTransactionAddress, getTokenOwnerRecordAddress,
    GovernanceConfig,
    GoverningTokenConfigAccountArgs,
    GoverningTokenType,
    MintMaxVoteWeightSource,
    Vote,
    VoteThreshold,
    VoteThresholdType,
    VoteTipping,
    VoteType,
    withCastVote,
    withCreateGovernance,
    withCreateProposal,
    withCreateRealm, withCreateTokenOwnerRecord,
    withExecuteTransaction, withFinalizeVote,
    withInsertTransaction, withSetGovernanceDelegate,
    withSignOffProposal,
    YesNoVote
} from "@solana/spl-governance";
import { VsrClient } from '@blockworks-foundation/voter-stake-registry-client'


import {
    Connection,
    Keypair,
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction
} from "@solana/web3.js";
import { withCreateMint } from "./tools/withCreateMint";
import * as fs from "fs";
import { sendTransaction } from "./tools/sdk";
import { withCreateAssociatedTokenAccount } from "./tools/withCreateAssociatedTokenAccount";
import { withMintTo } from "./tools/withMintTo";
import { createMemoInstruction } from "@solana/spl-memo";
import BN from "bn.js";
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ASSOCIATED_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token';
import * as readline from 'node:readline';
import { SmartWalletIDL, SmartWalletJSON } from './smartWalletIdl';

const connection = new Connection("http://127.0.0.1:8899");
const governanceProgramId = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");

const GOKI_PROGRAM_ID = new PublicKey(
    "GokivDYuQXPZCWRkwMhdH2h91KpDQXBEmpgBgs55bnpH"
);

class u64 extends BN {
    /**
     * Convert to Buffer representation
     */
    toBuffer() {
        const a = super.toArray().reverse();
        const b = Buffer.from(a);

        if (b.length === 8) {
            return b;
        }

        const zeroPad = Buffer.alloc(8);
        b.copy(zeroPad);
        return zeroPad;
    }
}

const secretKey = fs.readFileSync('/home/fzzyyti/.config/solana/id.json', 'utf-8')
const walletPkArray = Uint8Array.from(JSON.parse(secretKey));
let wallet = Keypair.fromSecretKey(walletPkArray);

const program = new Program<SmartWalletIDL>(
    SmartWalletJSON,
    GOKI_PROGRAM_ID,
    // Add in a dummy provider, this program doesn't need any RPC calls
    new AnchorProvider(
        connection,
        new NodeWallet(wallet),
        {}
    )
);

const test1 = async () => {
    const programVersion = 3;
    let instructions: TransactionInstruction[] = [];
    let signers: Keypair[] = [];
    signers.push(wallet);

    const nodeWallet = new NodeWallet(wallet);
    const provider = new AnchorProvider(connection, nodeWallet, AnchorProvider.defaultOptions());
    const vsr = await VsrClient.connect(provider, false);
    console.log("program id", vsr.program.programId);

    // Create and mint governance token
    let mintPk = await withCreateMint(
        connection,
        instructions,
        signers,
        wallet.publicKey,
        wallet.publicKey,
        0,
        wallet.publicKey,
    );

    let ataPk = await withCreateAssociatedTokenAccount(
        instructions,
        mintPk,
        wallet.publicKey,
        wallet.publicKey,
    );
    await withMintTo(instructions, mintPk, ataPk, wallet.publicKey,10_000_000_000);

    // Create Realm
    const name = `Realm-${new Keypair().publicKey.toBase58().slice(0, 6)}`;
    const realmAuthorityPk = wallet;

    const realmPk = await withCreateRealm(
        instructions,
        governanceProgramId,
        programVersion,
        name,
        realmAuthorityPk.publicKey,
        mintPk,
        wallet.publicKey,
        undefined,
        MintMaxVoteWeightSource.FULL_SUPPLY_FRACTION,
        new BN(1),
        new GoverningTokenConfigAccountArgs({voterWeightAddin: vsr.program.programId, maxVoterWeightAddin: undefined, tokenType: GoverningTokenType.Liquid})
    );

    const tokenOwnerRecordPk = await getTokenOwnerRecordAddress(governanceProgramId, realmPk, mintPk, wallet.publicKey);
    await withCreateTokenOwnerRecord(
        instructions,
        governanceProgramId,
        3,
        realmPk,
        wallet.publicKey,
        mintPk,
        wallet.publicKey
        );

    let communityVoteThreshold = new VoteThreshold({
        type: VoteThresholdType.YesVotePercentage,
        value: 10,
    });

    let councilVoteThreshold = new VoteThreshold({
        type: VoteThresholdType.YesVotePercentage,
        // For VERSION < 3 we have to pass 0
        value: programVersion >= 3 ? 10 : 0,
    });

    let councilVetoVoteThreshold = new VoteThreshold({
        type: VoteThresholdType.YesVotePercentage,
        // For VERSION < 3 we have to pass 0
        value: programVersion >= 3 ? 10 : 0,
    });

    const config = new GovernanceConfig({
        communityVoteThreshold: communityVoteThreshold,
        minCommunityTokensToCreateProposal: new BN(1),
        minInstructionHoldUpTime: 0,
        baseVotingTime: 3600,//getTimestampFromDays(1),
        communityVoteTipping: VoteTipping.Strict,
        councilVoteTipping: VoteTipping.Strict,
        minCouncilTokensToCreateProposal: new BN(1),
        councilVoteThreshold: councilVoteThreshold,
        councilVetoVoteThreshold: councilVetoVoteThreshold,
        communityVetoVoteThreshold: councilVetoVoteThreshold,
        votingCoolOffTime: 0,
        depositExemptProposalCount: 0,
    });


    console.log("realm is", realmPk.toBase58());
    console.log("mint is", mintPk.toBase58());
    console.log("ata is", ataPk.toBase58());
    console.log("signers are",signers);
    console.log("tokenOwnerRecordPk is", tokenOwnerRecordPk.toBase58());
    //holding
    const tokenHolding = PublicKey.findProgramAddressSync([Buffer.from("governance"), realmPk.toBuffer(), mintPk.toBuffer()], governanceProgramId)[0];
    console.log("token holding is", tokenHolding.toBase58());
    await sendTransaction(connection, instructions, signers, wallet)
    instructions = [];
    signers = [];




    const [registrar, registrarBump] = PublicKey.findProgramAddressSync([realmPk.toBuffer(), Buffer.from("registrar"), mintPk.toBuffer()], vsr.program.programId);
    const registrarSig = await vsr.program.methods.createRegistrar(registrarBump).accounts({
        registrar,
        realm: realmPk,
        governanceProgramId,
        realmGoverningTokenMint: mintPk,
        realmAuthority: realmAuthorityPk.publicKey,
        payer: provider.publicKey
    }).rpc();
    console.log("created registrar", registrarSig);
    const addVotingMintSig = await vsr.program.methods.configureVotingMint(
        0,
        0,
        new BN(100000000),
        new BN(900000000),
        new BN(157680000),
        null
    ).accounts(
        {
            registrar,
            realmAuthority: realmAuthorityPk.publicKey,
            mint: mintPk,
        }
    ).remainingAccounts([
        {
            pubkey: mintPk,
            isSigner: false,
            isWritable: false
        }
    ]).rpc();
    console.log("added voting mint", addVotingMintSig);

    const [voter, voterBump] = PublicKey.findProgramAddressSync([registrar.toBuffer(), Buffer.from("voter"), wallet.publicKey.toBuffer()], vsr.program.programId);
    const [voterWeightRecord, voterWeightRecordBump] = PublicKey.findProgramAddressSync([registrar.toBuffer(), Buffer.from("voter-weight-record"), wallet.publicKey.toBuffer()], vsr.program.programId);
    const createVoterSig = await vsr.program.methods.createVoter(
        voterBump,
        voterWeightRecordBump
    ).accounts({
        registrar,
        voter,
        voterAuthority: wallet.publicKey,
        voterWeightRecord,
        payer: wallet.publicKey,
        rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
        instructions: new PublicKey("Sysvar1nstructions1111111111111111111111111")
    }).rpc();
    console.log("create voter sig", createVoterSig);

    const vaultAta = getAssociatedTokenAddressSync(mintPk, voter, true);

    const createDepositEntrySig = await vsr.program.methods.createDepositEntry(
        0,
        {constant: {}},
        null,
        100,
        false
    ).accounts({
        registrar,
        voter,
        vault: vaultAta,
        voterAuthority: wallet.publicKey,
        payer: wallet.publicKey,
        depositMint: mintPk,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        rent: new PublicKey("SysvarRent111111111111111111111111111111111")
    }).rpc()
    console.log("create deposit entry sig", createDepositEntrySig);

    const depositSig = await vsr.program.methods.deposit(
        0,
        new BN(10_000_000_000)).accounts({
        registrar,
        voter,
        vault: vaultAta,
        depositToken: ataPk,
        depositAuthority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
    }).rpc()
    console.log("deposit sig", depositSig);

    //Create proposal
    const voteType = VoteType.SINGLE_CHOICE;
    const options = ['Approve'];
    const useDenyOption = true;


    instructions = [];

    const governedAcct = Keypair.generate();

    console.log("registrar is", registrar.toBase58());
    await (new Promise(f => setTimeout(f, 20000)));
    const updateVoterWeightRecord = await vsr.program.methods.updateVoterWeightRecord().accounts({
        registrar,
        voter,
        voterWeightRecord,
    }).instruction();
    instructions.push(updateVoterWeightRecord);

    const governancePk = await withCreateGovernance(
        instructions,
        governanceProgramId,
        programVersion,
        realmPk,
        governedAcct.publicKey,
        config,
        tokenOwnerRecordPk,
        wallet.publicKey,
        wallet.publicKey,
        voterWeightRecord
    );


    await sendTransaction(connection, instructions, signers, wallet);
    console.log("created governance");

    instructions = [];

    instructions.push(updateVoterWeightRecord);
    const proposalPk = await withCreateProposal(
        instructions,
        governanceProgramId,
        programVersion,
        realmPk,
        governancePk,
        tokenOwnerRecordPk,
        'proposal 1',
        '',
        mintPk,
        wallet.publicKey,
        0,
        voteType,
        options,
        useDenyOption,
        wallet.publicKey,
        voterWeightRecord
    );

    await sendTransaction(connection, instructions, signers, wallet);
    console.log("created proposal");

    instructions = [];

    const [nativeTreasury, _] = PublicKey.findProgramAddressSync([Buffer.from("native-treasury"), governancePk.toBuffer()], governanceProgramId);
    // Vote after setup
    const memoInstruction = createMemoInstruction("What's up?",
        [nativeTreasury]
    );
    const instructionData = createInstructionData(memoInstruction);
    await withInsertTransaction(
        instructions,
        governanceProgramId,
        programVersion,
        governancePk,
        proposalPk,
        tokenOwnerRecordPk,
        wallet.publicKey,
        0,
        0,
        1,
        [instructionData],
        wallet.publicKey
    );
    withSignOffProposal(
        instructions,
        governanceProgramId,
        programVersion,
        realmPk,
        governancePk,
        proposalPk,
        wallet.publicKey,
        undefined,
        tokenOwnerRecordPk,
    );

    await sendTransaction(connection, instructions, signers, wallet);
    console.log("proposal creation done");
    // Delegate
    const gokiWallet = await createGokiWallet(program);
    const ownerInvoker = findOwnerInvokerAddress(gokiWallet)[0];

    instructions = [];
    await withSetGovernanceDelegate(
        instructions,
        governanceProgramId,
        programVersion,
        realmPk,
        mintPk,
        wallet.publicKey,
        wallet.publicKey,
        ownerInvoker
    );
    await sendTransaction(connection, instructions, signers, wallet);

    console.log("gov delegate set to goki wallet");



    // Cast Vote
    instructions = [];
    signers = [];

    const vote = Vote.fromYesNoVote(YesNoVote.Yes);
    instructions.push(updateVoterWeightRecord);

    let unwrappedIx: TransactionInstruction[] = [];
    const votePk = await withCastVote(
        unwrappedIx,
        governanceProgramId,
        programVersion,
        realmPk,
        governancePk,
        proposalPk,
        tokenOwnerRecordPk, // Proposal owner TokenOwnerRecord
        tokenOwnerRecordPk, // Voter TokenOwnerRecord
        wallet.publicKey, // Voter wallet or delegate
        mintPk,
        vote,
        wallet.publicKey,
        voterWeightRecord
    );

    instructions.push(await createGokiIx(unwrappedIx[0], gokiWallet, program));

    await sendTransaction(connection, instructions, signers, wallet);
    console.log("tried to vote with delegate");
    await new Promise(f => setTimeout(f, 10000));

    console.log("proposal a pk", await getProposal(connection, proposalPk));
    await pauseExecution();
    console.log("proposal c pk", await getProposal(connection, proposalPk));
    await new Promise(f => setTimeout(f, 20000));
    instructions = [];
    await withFinalizeVote(
        instructions,
        governanceProgramId,
        programVersion,
        realmPk,
        governancePk,
        proposalPk,
        tokenOwnerRecordPk,
        mintPk);

    console.log("proposal pk b", await getProposal(connection, proposalPk));
    await sendTransaction(connection, instructions, signers, wallet);
    await new Promise(f => setTimeout(f, 20000));

    console.log("got there")
    instructions = [];
    signers = [];
    const proposalTransactionAddress = await getProposalTransactionAddress(
        governanceProgramId,
        programVersion,
        proposalPk,
        0,
        0,
    );
    console.log("native treasury is", nativeTreasury.toBase58());
    console.log("proposalTransactionAddress is", proposalTransactionAddress.toBase58());

    const p = await getProposal(connection, proposalPk);
    console.log("proposal pk", proposalPk);
    console.log("proposal", JSON.stringify(p));
    await withExecuteTransaction(
        instructions,
        governanceProgramId,
        programVersion,
        governancePk,
        proposalPk,
        proposalTransactionAddress,
        [instructionData]
    );


    // await new Promise(f => setTimeout(f, 10000));
    // const propInfo = await getProposal(connection, proposalPk);
    // console.log("prop info", JSON.stringify(propInfo));
    // console.log("prop info", propInfo);
//    await sendTransaction(connection, instructions, signers, wallet);
    console.log("here");
    const executeMessageBlockhash = await connection.getLatestBlockhash();
    console.log("there");
    const executeMessage = new TransactionMessage({
        recentBlockhash: executeMessageBlockhash.blockhash,
        instructions: [await createGokiIx(instructions[0], gokiWallet, program)],
        payerKey: wallet.publicKey
    }).compileToV0Message();
    const executeTx = new VersionedTransaction(executeMessage);
    executeTx.sign([wallet]);
    const sig = await connection.sendTransaction(executeTx);
    console.log("sent", sig);
    await connection.confirmTransaction({
        signature: sig,
        ...executeMessageBlockhash
    });
    console.log("executed", sig);
    // const sim = await connection.simulateTransaction(executeTx);
    // console.log("sim", JSON.stringify(sim));

}

async function createGokiWallet(program: Program<SmartWalletIDL>) {
    const base = Keypair.generate();
    const [smartWallet, smartWalletBump]  = PublicKey.findProgramAddressSync([Buffer.from("GokiSmartWallet"), base.publicKey.toBuffer()], GOKI_PROGRAM_ID);
    const createWalletSig = await program.methods.createSmartWallet(
        smartWalletBump,
        1,
        [wallet.publicKey],
        new BN(1),
        new BN(0)
    ).accounts({
        base: base.publicKey,
        smartWallet,
        payer: wallet.publicKey
    }).signers([wallet, base]).rpc();
    console.log("created wallet", createWalletSig);
    return smartWallet;
}

const findOwnerInvokerAddress = (smartWallet: PublicKey, index = 0) => {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("GokiSmartWalletOwnerInvoker"),
            smartWallet.toBuffer(),
            new u64(index).toBuffer(),
        ],
        GOKI_PROGRAM_ID
    );
};

async function createGokiIx(instruction: TransactionInstruction, smartWallet: PublicKey, program: Program<SmartWalletIDL>) {
    const [invokerAddress,invokerBump] = findOwnerInvokerAddress(smartWallet);
    return program.methods.ownerInvokeInstructionV2(
        new BN(0),
        invokerBump,
        invokerAddress,
        instruction.data).accounts(
            {
                smartWallet,
                owner: wallet.publicKey,
            }).remainingAccounts([
                {
                    pubkey: instruction.programId,
                    isSigner: false,
                    isWritable: false,
                },
                ...instruction.keys.map((k) => {
                    if (k.isSigner && invokerAddress.equals(k.pubkey)) {
                        return {
                            ...k,
                            isSigner: false,
                        };
                    }
                    return k;
                }),
            ]).instruction();
}

function pauseExecution(message: string = "run `solana-test-validator --warp-slot 20000` advancing 20k past the current slot"): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise<void>((resolve) => {
        rl.question(message, () => {
            rl.close();
            resolve();
        });
    });
}

test1();


