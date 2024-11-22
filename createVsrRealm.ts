import {
    createInstructionData,
    getProposalTransactionAddress,
    GovernanceConfig,
    GoverningTokenConfigAccountArgs,
    GoverningTokenType,
    MintMaxVoteWeightSource,
    MintMaxVoteWeightSourceType,
    Vote,
    VoteThreshold,
    VoteThresholdType,
    VoteTipping,
    VoteType,
    withCastVote,
    withCreateGovernance,
    withCreateProposal,
    withCreateRealm,
    withDepositGoverningTokens,
    withExecuteTransaction,
    withFlagTransactionError,
    withInsertTransaction,
    withSetRealmConfig,
    withSignOffProposal,
    YesNoVote
} from "@solana/spl-governance";
import { VsrClient } from '@blockworks-foundation/voter-stake-registry-client'


import { Connection, Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { withCreateMint } from "./tools/withCreateMint";
import * as fs from "fs";
import { sendTransaction } from "./tools/sdk";
import { withCreateAssociatedTokenAccount } from "./tools/withCreateAssociatedTokenAccount";
import { withMintTo } from "./tools/withMintTo";
import { getTimestampFromDays } from "./tools/units";
import { createMemoInstruction } from "@solana/spl-memo";
import BN from "bn.js";
import { AnchorProvider } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ASSOCIATED_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token';

const connection = new Connection("http://127.0.0.1:8899");
const governanceProgramId = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");
const grapeRealm = new PublicKey('By2sVGZXwfQq6rAiAM3rNPJ9iQfb5e2QhnF4YjJ4Bip');

const test1 = async () => {
    const programVersion = 3;
    let instructions: TransactionInstruction[] = [];
    let signers: Keypair[] = [];
    const secretKey = fs.readFileSync('/home/fzzyyti/.config/solana/id.json', 'utf-8')
    const walletPkArray = Uint8Array.from(JSON.parse(secretKey));
    let wallet = Keypair.fromSecretKey(walletPkArray);
    signers.push(wallet);

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
    await withMintTo(instructions, mintPk, ataPk, wallet.publicKey,10);

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
        new GoverningTokenConfigAccountArgs({voterWeightAddin: undefined, maxVoterWeightAddin: undefined, tokenType: GoverningTokenType.Liquid})
    );

    //let dummyIxs: TransactionInstruction[] = []
    // Deposit governance tokens
    const tokenOwnerRecordPk = await withDepositGoverningTokens(
        instructions,
        governanceProgramId,
        programVersion,
        realmPk,
        ataPk,
        mintPk,
        wallet.publicKey,
        wallet.publicKey,
        wallet.publicKey,
        new BN(1),
    );

    let communityVoteThreshold = new VoteThreshold({
        type: VoteThresholdType.YesVotePercentage,
        value: 60,
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
        baseVotingTime: getTimestampFromDays(3),
        communityVoteTipping: VoteTipping.Strict,
        councilVoteTipping: VoteTipping.Strict,
        minCouncilTokensToCreateProposal: new BN(1),
        councilVoteThreshold: councilVoteThreshold,
        councilVetoVoteThreshold: councilVetoVoteThreshold,
        communityVetoVoteThreshold: councilVetoVoteThreshold,
        votingCoolOffTime: 0,
        depositExemptProposalCount: 0,
    });

    const governedAcct = Keypair.generate();

    const governancePk = await withCreateGovernance(
        instructions,
        governanceProgramId,
        programVersion,
        realmPk,
        governedAcct.publicKey,
        config,
        tokenOwnerRecordPk,
        wallet.publicKey,
        wallet.publicKey
    );

    const voteType = VoteType.SINGLE_CHOICE;
    const options = ['Approve'];
    const useDenyOption = true;

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
    );
    const [nativeTreasury, _] = PublicKey.findProgramAddressSync([Buffer.from("native-treasury"), governancePk.toBuffer()], governanceProgramId);
    console.log("realm is", realmPk.toBase58());
    console.log('governance is', governancePk.toBase58());
    console.log("proposal is", proposalPk.toBase58());
    console.log("mint is", mintPk.toBase58());
    console.log("ata is", ataPk.toBase58());
    console.log("signers are",signers);
    console.log("native treasury is", nativeTreasury.toBase58());
    console.log("tokenOwnerRecordPk is", tokenOwnerRecordPk.toBase58());
    //holding
    const tokenHolding = PublicKey.findProgramAddressSync([Buffer.from("governance"), realmPk.toBuffer(), mintPk.toBuffer()], governanceProgramId)[0];
    console.log("token holding is", tokenHolding.toBase58());
    await sendTransaction(connection, instructions, signers, wallet)
    instructions = [];
    signers = [];


    const nodeWallet = new NodeWallet(wallet);
    const provider = new AnchorProvider(connection, nodeWallet, AnchorProvider.defaultOptions());
    const vsr = await VsrClient.connect(provider, false);
    console.log("program id", vsr.program.programId);


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

    // let realmConfigIxs: TransactionInstruction[] = [];
    // await withSetRealmConfig(
    //     realmConfigIxs,
    //     governanceProgramId,
    //     3,
    //     realmPk,
    //     realmAuthorityPk.publicKey,
    //     undefined,
    //     new MintMaxVoteWeightSource({type: MintMaxVoteWeightSourceType.Absolute, value: new BN(1000000000)}),
    //     new BN(1),
    //     new GoverningTokenConfigAccountArgs({voterWeightAddin: vsr.program.programId, maxVoterWeightAddin: undefined, tokenType: GoverningTokenType.Liquid }),
    //     undefined,
    //     undefined
    // );
    // await sendTransaction(connection, realmConfigIxs, [realmAuthorityPk], realmAuthorityPk);
    // console.log("setup realm config");
    // // Create voter

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
        {none: {}},
        null,
        0,
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
        new BN(1)).accounts({
        registrar,
        voter,
        vault: vaultAta,
        depositToken: ataPk,
        depositAuthority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
    }).rpc()
    console.log("deposit sig", depositSig);

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
    console.log("got here");

    // Cast Vote
    instructions = [];
    signers = [];

    const vote = Vote.fromYesNoVote(YesNoVote.Yes);

    const updateVoterWeightRecord = await vsr.program.methods.updateVoterWeightRecord().accounts({
        registrar,
        voter,
        voterWeightRecord,
    }).instruction();
    instructions.push(updateVoterWeightRecord);

    const votePk = await withCastVote(
        instructions,
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
    );

    await sendTransaction(connection, instructions, signers, wallet);

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

    withFlagTransactionError(
        instructions,
        governanceProgramId,
        programVersion,
        proposalPk,
        tokenOwnerRecordPk,
        wallet.publicKey,
        proposalTransactionAddress,
    );
    await withExecuteTransaction(
        instructions,
        governanceProgramId,
        programVersion,
        governancePk,
        proposalPk,
        proposalTransactionAddress,
        [instructionData]
    )
    await new Promise(f => setTimeout(f, 10000));
    await sendTransaction(connection, instructions, signers, wallet);


}

test1();
