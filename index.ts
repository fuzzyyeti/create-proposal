import {
    getRealm,
    getAllGovernances,
    getGovernanceAccount,
    Governance, withDepositGoverningTokens
} from "@solana/spl-governance";
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import fs from 'fs';
import { AnchorProvider, Program, web3, BN} from '@coral-xyz/anchor';
import { SmartWalletIDL, SmartWalletJSON } from './smartWalletIdl';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';


const GOKI_PROGRAM_ID = new web3.PublicKey(
    "GokivDYuQXPZCWRkwMhdH2h91KpDQXBEmpgBgs55bnpH"
);

const SMART_WALLET = new web3.PublicKey(
    "Eh7BJiZVxJ5bv9XA7NGS5UQTHmt1eZGb6aVFdSCT8XMg"
);

// @ts-ignore
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

const connection = new Connection("http://api.mainnet-beta.solana.com");
const programId = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");
const grapeRealm = new PublicKey('By2sVGZXwfQq6rAiAM3rNPJ9iQfb5e2QhnF4YjJ4Bip');
const test1 = async () => {
    const realms = await getRealm(connection, grapeRealm);
    console.log(realms);
   // const governedAccount = new PublicKey('8BjWh1K4T7RhifJvZ3yDSe5i7qB8VtkvRZTtecC49Esu');
     const governedAccount = new PublicKey('6jEQpEnoSRPP8A2w6DWDQDpqrQTJvG4HinaugiBGtQKD');
    const govPda = PublicKey.findProgramAddressSync([Buffer.from('account-governance'), grapeRealm.toBuffer(), governedAccount.toBuffer() ], programId)[0];
    console.log("Account Governance", govPda.toBase58());
    const tokenAccount = new PublicKey('6jEQpEnoSRPP8A2w6DWDQDpqrQTJvG4HinaugiBGtQKD');
    const tokenPda = PublicKey.findProgramAddressSync([Buffer.from('token-governance'), grapeRealm.toBuffer(), tokenAccount.toBuffer() ], programId)[0];
    console.log("Account Governance", tokenPda.toBase58());
    const programAccount = new PublicKey('6jEQpEnoSRPP8A2w6DWDQDpqrQTJvG4HinaugiBGtQKD');
    const programPda = PublicKey.findProgramAddressSync([Buffer.from('program-governance'), grapeRealm.toBuffer(), programAccount.toBuffer() ], programId)[0];
    console.log("Account Governance", programPda.toBase58());
//    const realmAddress = PublicKey.findProgramAddressSync([Buffer.from("first_seed"), Buffer.from('governance'), Buffer.from('Grape'), grapeRelam.toBuffer()], programId)[0];
    const realmAddress = PublicKey.findProgramAddressSync([Buffer.from('governance'), Buffer.from('Grape')], programId)[0];
    console.log(realmAddress.toBase58());
    //expect FCLy
};
const test2 = async () => {
    const governances = await getAllGovernances(connection,  programId, grapeRealm);
    console.log(governances);

}

const test3 = async () => {
    const governance = new PublicKey("BUfya7kEAgoCGtN3SYXiPciVjoe4dCo8EfnEuvaMTfHs")
    const govAcct = await getGovernanceAccount(connection, governance,Governance);
    console.log(govAcct);
    console.log("test3");
    const nativeTreasury = PublicKey.findProgramAddressSync([Buffer.from('native-treasury'), governance.toBuffer()], programId)[0];
    console.log(nativeTreasury.toBase58());
}
const test4 = () => {
    //check if key is off curve
    const key = new PublicKey("8riMM26Kim8FpEp4LczDRD7prJoKaSc5Gc6ndSLwW7M6");
    console.log(`Key is ${PublicKey.isOnCurve(key.toBuffer()) ? "" : " not"} on curve`);

}

const test5 = async () => {
    const governanceAccount = new PublicKey("oyznFCoGLEr8mWWfroGRbhtPE7wUVMMy1X9Rhv3RvqD");
    const nativeTreasury = PublicKey.findProgramAddressSync([Buffer.from('native-treasury'), governanceAccount.toBuffer()], programId)[0];
    console.log("treasury", nativeTreasury.toBase58());
    const governanceAccountParsed = await getGovernanceAccount(connection, governanceAccount, Governance);
    console.log(governanceAccountParsed.account.realm.toBase58());
}

const depositBlaze = async () => {
    let instructions : TransactionInstruction[] = [];
   const whatKey = await withDepositGoverningTokens(
       instructions,
       new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw"),
       3,
       new PublicKey("7vrFDrK9GRNX7YZXbo7N3kvta7Pbn6W1hCXQ6C7WBxG9"),
       new PublicKey("Hq57efaeQghGKdjWCkQpDD1MCARUWFZk9MtWoNLE2yVQ"),
       new PublicKey("BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA"),
       new PublicKey("AMd2nnFYtPGkeEbUvyVtWRDkG3nrESCvNW4C43mEvWrF"),
       new PublicKey("AMd2nnFYtPGkeEbUvyVtWRDkG3nrESCvNW4C43mEvWrF"),
       new PublicKey("J57bRWpXPD1LvtMYWtUSKijwu5WBSytsfGqqQFw5BVPH"),
       new BN(999999999));
    const keypair = web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('/home/fzzyyti/.config/solana/blaze-delegate.json', 'utf-8'))));
    const program = new Program<SmartWalletIDL>(
        SmartWalletJSON,
        GOKI_PROGRAM_ID,
        // Add in a dummy provider, this program doesn't need any RPC calls
        new AnchorProvider(
            new web3.Connection("https://mainnet.helius-rpc.com/?api-key=2c959c1d-9b86-4881-8efc-7997e626ba09"),
            new NodeWallet(keypair),
            {}
        )
    );

    const [ownerInvoker, ownerInvokerBump] = web3.PublicKey.findProgramAddressSync([
        Buffer.from("GokiSmartWalletOwnerInvoker"),
        SMART_WALLET.toBuffer(),
        new u64(0).toBuffer(),
    ], GOKI_PROGRAM_ID);
    const ix = instructions[0];

    const sig = await program.methods.ownerInvokeInstructionV2(
        // @ts-ignore
        new u64(0),
        ownerInvokerBump,
        ownerInvoker,
        // @ts-ignore
        ix.data
    ).accounts({
        smartWallet: SMART_WALLET,
        owner: keypair.publicKey,
    }).remainingAccounts(
        [
            {
                pubkey: ix.programId,
                isSigner: false,
                isWritable: false,
            },
            ...ix.keys.map((k) => {
                if (k.isSigner && ownerInvoker.equals(k.pubkey)) {
                    return {
                        ...k,
                        isSigner: false,
                    };
                }
                return k;
            }),
        ]
    ).signers([keypair]).rpc();

    console.log('sig is', sig);

}

depositBlaze();
