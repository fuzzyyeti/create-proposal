import {
    getRealm,
    getAllGovernances,
    getGovernanceAccount,
    Governance
} from "@solana/spl-governance";
import {Connection, PublicKey} from "@solana/web3.js";

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

test5();
