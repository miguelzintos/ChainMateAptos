import { Aptos, AptosConfig, Network, Account, AccountAddress } from "@aptos-labs/ts-sdk";
import config from '../../aptos.config';

const aptosConfig = new AptosConfig({
  network: Network.RANDOMNET,
});
const aptos = new Aptos(aptosConfig);
// generate a new account key pair
const alice: Account = Account.generate();

async function fundAccount() {
    // create the account on chain
  await aptos.fundAccount({
    accountAddress: alice.accountAddress,
    amount: 100000000,
  });

}

export async function createProfile(creator: string, tokenUri: string): Promise<string> {

  const txn = await aptos.transaction.build.simple({    
    sender: alice.accountAddress,
    data: {
      function: `${config.moduleAddress}::chainmate::create_profile`,
      typeArguments: [],
      functionArguments: [creator, tokenUri],
    },
  });

  // sign and submit transaction to chain
  const response = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
  await aptos.waitForTransaction({ transactionHash: response.hash });

  console.log(`Profile created. Transaction hash: ${response.hash}`);
  return response.hash;
}

export async function createMatch(user1: string, user2: string): Promise<string> {
  const txn = await aptos.transaction.build.simple({    
    sender: alice.accountAddress,
    data: {
      function: `${config.moduleAddress}::chainmate::create_match`,
      typeArguments: [],
      functionArguments: [user1, user2],
  }
});

  // sign and submit transaction to chain
  const response = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
  await aptos.waitForTransaction({ transactionHash: response.hash });

  console.log(`Match created. Transaction hash: ${response.hash}`);

  return response.hash;
}

export async function unmatch(user1: string, user2: string): Promise<string> {
  const txn = await aptos.transaction.build.simple({    
    sender: alice.accountAddress,
    data: {
      function: `${config.moduleAddress}::chainmate::unmatch`,
      typeArguments: [],
      functionArguments: [user1, user2],
  }
})

  // sign and submit transaction to chain
  const response = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
  await aptos.waitForTransaction({ transactionHash: response.hash });

  console.log(`Unmatched users. Transaction hash: ${response.hash}`);
  return response.hash;
}

export async function onSwipeLeft(user: string, score: number): Promise<string> {
  const txn = await aptos.transaction.build.simple({    
    sender: alice.accountAddress,
    data: {
      function: `${config.moduleAddress}::chainmate::left_swipe_score_update`,
      typeArguments: [],
      functionArguments: [user, score],
  }
})

  // sign and submit transaction to chain
  const response = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
  await aptos.waitForTransaction({ transactionHash: response.hash });

  console.log(`Left Swipe score updated. Transaction hash: ${response.hash}`);
  return response.hash;
}

export async function onSwipeRight(user: string, score: number): Promise<string> {
  const txn = await aptos.transaction.build.simple({    
    sender: alice.accountAddress,
    data: {
      function: `${config.moduleAddress}::chainmate::right_swipe_score_update`,
      typeArguments: [],
      functionArguments: [user, score],
  }
})

  // sign and submit transaction to chain
  const response = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
  await aptos.waitForTransaction({ transactionHash: response.hash });

  console.log(`Right Swipe score updated. Transaction hash: ${response.hash}`);
  return response.hash;
}

export interface Profile {
  id: string;
  profileScore: BigInt;
  age: number;
  bio: string;
}

export async function getProfiles(): Promise<Profile[]> {
  const resource = await aptos.getAccountResource({
    accountAddress: alice.accountAddress,
    resourceType: `${config.moduleAddress}::chainmate::ProfileStore`,
});

  // Using TextDecoder
  const decoder = new TextDecoder('utf-8');

  const profilesTable: Profile[] = resource.data.profiles.map((profile: any) => ({
    id: decoder.decode(profile.id),
    profileScore: BigInt(profile.profile_score),
    age: profile.age,
    bio: profile.bio,
  }));
  return profilesTable;
}