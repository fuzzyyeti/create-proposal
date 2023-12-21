import {
    GovernanceConfig,
    MintMaxVoteWeightSource,
    VoteThreshold,
    VoteThresholdType,
    VoteTipping,
    VoteType,
    withCreateGovernance,
    withCreateProposal,
    withCreateRealm,
    withDepositGoverningTokens,
    createInstructionData,
    withSignOffProposal,
    withInsertTransaction,
    Vote,
    YesNoVote,
    withCastVote,
    withExecuteTransaction, getProposalTransactionAddress, withFlagTransactionError
} from "@solana/spl-governance";

import {Connection, Keypair, PublicKey, TransactionInstruction} from "@solana/web3.js";
import {withCreateMint} from "./tools/withCreateMint";
import * as fs from "fs";
import {sendTransaction} from "./tools/sdk";
import {withCreateAssociatedTokenAccount} from "./tools/withCreateAssociatedTokenAccount";
import {withMintTo} from "./tools/withMintTo";
import {getTimestampFromDays} from "./tools/units";
import {createMemoInstruction} from "@solana/spl-memo";
import BN from "bn.js";

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
    await withMintTo(instructions, mintPk, ataPk, wallet.publicKey, 1);

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
    );

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

    console.log("mint is", mintPk.toBase58());
    console.log("signers are",signers);
    await sendTransaction(connection, instructions, signers, wallet)
    instructions = [];
    signers = [];

    const [nativeTreasury, _] = PublicKey.findProgramAddressSync([Buffer.from("native-treasury"), governancePk.toBuffer()], governanceProgramId);
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

    // Cast Vote
    instructions = [];
    signers = [];

    const vote = Vote.fromYesNoVote(YesNoVote.Yes);

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

    console.log("realm is", realmPk.toBase58());
    console.log('governance is', governancePk.toBase58());
    console.log("proposal is", proposalPk.toBase58());
    console.log("done");
}

test1();
