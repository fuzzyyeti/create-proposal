import { VsrClient } from '@blockworks-foundation/voter-stake-registry-client';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import fs from 'fs';

(async () => {


    const realm = new PublicKey("7vrFDrK9GRNX7YZXbo7N3kvta7Pbn6W1hCXQ6C7WBxG9");
    const authority = new PublicKey("9Y8Mw3kWjuu4CQVKko65W1VGXUsh6oSM4rzwLotsdQgU");
    const governanceProgramId = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");
    const governanceTokenMint = new PublicKey("BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA");
    const connection = new Connection("Your RPC");
    const secretKey = fs.readFileSync('/home/fzzyyti/.config/solana/id.json', 'utf-8')
    const walletPkArray = Uint8Array.from(JSON.parse(secretKey));
    let wallet = Keypair.fromSecretKey(walletPkArray);
    const nodeWallet = new NodeWallet(wallet);
    const provider = new AnchorProvider(connection, nodeWallet, AnchorProvider.defaultOptions());
    const vsr = await VsrClient.connect(provider, false);
    console.log("program id", vsr.program.programId);


    const [registrar, registrarBump] = PublicKey.findProgramAddressSync([realm.toBuffer(), Buffer.from("registrar"), governanceTokenMint.toBuffer()], vsr.program.programId);
    const reg : any = await vsr.program.account.registrar.fetch(registrar);
    console.log("registrar", reg);
    console.log(reg.votingMints[0].baselineVoteWeightScaledFactor.toString());
    console.log(reg.votingMints[0].maxExtraLockupVoteWeightScaledFactor.toString());
    console.log(reg.votingMints[0].lockupSaturationSecs.toString());

})();
