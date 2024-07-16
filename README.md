# ChainMateAptos
ChainMate is a revolutionary dating application built on Aptos, leveraging on-chain randomness in its matching algorithm to ensure equitable pairings between individuals seeking meaningful connections.

# ChainMate Move Module Explanation

This `ChainMate` module is written in the Move language and is designed for the Aptos blockchain. The module provides functionalities for creating profiles, minting profile tokens as NFTs, and handling user matches.

## Imports and Constants

```move
use std::vector;    
use aptos_framework::randomness;  
use std::signer;
use std::hash;
use std::string::{Self, String};
use std::option::{Self, Option};
use aptos_framework::object;
use aptos_token_objects::collection;
use aptos_token_objects::property_map;
use aptos_token_objects::token;
use std::bcs;
use std::error;
use std::table;
use aptos_framework::account;
use aptos_framework::event::{Self, EventHandle};

const COLLECTION_NAME: vector<u8> = b"ChainMate";
const COLLECTION_DESCRIPTION: vector<u8> = b"This is a NFT minted to the user creating a profile on ChainMate";
```

The module imports various standard libraries and Aptos framework modules required for vector manipulation, randomness, string operations, option handling, object management, token creation, and more.

### Error Codes

```move
const USER_PROFILE_DOES_NOT_EXIST: u64 = 1;
const SWIPED_USER_PROFILE_DOES_NOT_EXIST: u64 = 2;
const INVALID_BATCH_UPDATE: u64 = 3;
const EMATCH_NOT_FOUND: u64 = 4;
```

These constants define error codes for various possible errors in the module.

## Struct Definitions

### `Match` Struct

```move
struct Match has store, drop {
    user1: address,
    user2: address,
}
```

Represents a match between two users identified by their addresses.

### `MatchTable` Struct

```move
struct MatchTable has key {
    matches: table::Table<u64, Match>,
    current_match_id: u64,
}
```

Stores all matches in a table, with a `current_match_id` to keep track of the latest match ID.

### `Profile` Struct

```move
struct Profile has key, store, copy {
    id: vector<u8>,
    profile_score: u64,
    age: u8,
    bio: String,
}
```

Represents a user profile with a unique ID, score, age, and biography.

### `MatchHandler` Struct

```move
struct MatchHandler has key, store {
    all_matches: table::Table<address, u64>,
    match_event: EventHandle<MatchEvent>,
    unmatch_event: EventHandle<UnmatchEvent>,
}
```

Handles matches for a user, storing all matches and emitting events for matches and unmatches.

### `ProfileStore` Struct

```move
struct ProfileStore has key {
    profiles: vector<Profile>,
    current_index_id: u64,
}
```

Stores all user profiles and tracks the current profile index ID.

### Event Structs

```move
struct MatchEvent has drop, store {
    match_id: u64,
}

struct UnmatchEvent has drop, store {
    match_id: u64,
}
```

Events that are emitted when a match or unmatch occurs.

### `ProfileToken` Struct

```move
struct ProfileToken has key {
    mutator_ref: token::MutatorRef,
    burn_ref: token::BurnRef,
    property_mutator_ref: property_map::MutatorRef,
    base_uri: String,
}
```

Represents a profile token with references for mutating the token, burning it, and mutating its properties.

## Functions

### `init_module`

```move
fun init_module(creator: &signer) {
    let description = string::utf8(COLLECTION_DESCRIPTION);
    let name = string::utf8(COLLECTION_NAME);
    let uri = string::utf8(b"");

    move_to(creator, ProfileStore {
        profiles: vector::empty<Profile>(),
        current_index_id: 0
    });

    move_to(creator, MatchTable {
        matches: table::new(),
        current_match_id: 0
    });

    collection::create_unlimited_collection(
        creator,
        description,
        name,
        option::none(),
        uri,
    );
}
```

Initializes the module by setting up the `ProfileStore`, `MatchTable`, and creating an unlimited collection for NFTs.

### `mint_profile_token`

```move
public entry fun mint_profile_token(
    creator: &signer,
    index: u64,
    base_uri: String,
    soul_bound_to: address,
    profile_uid: vector<u8>,
) {
    let collection = string::utf8(COLLECTION_NAME);
    let name = string::utf8(b"ChainMate");
    let description = string::utf8(COLLECTION_DESCRIPTION);
    string::append(&mut name, string::utf8(b" member #"));
    string::append(&mut name, to_string(index));
    let uri = base_uri;
    let constructor_ref = token::create_named_token(
        creator,
        collection,
        description,
        name,
        option::none(),
        uri,
    );

    let object_signer = object::generate_signer(&constructor_ref);
    let transfer_ref = object::generate_transfer_ref(&constructor_ref);
    let mutator_ref = token::generate_mutator_ref(&constructor_ref);
    let burn_ref = token::generate_burn_ref(&constructor_ref);
    let property_mutator_ref = property_map::generate_mutator_ref(&constructor_ref);

    let linear_transfer_ref = object::generate_linear_transfer_ref(&transfer_ref);
    object::transfer_with_ref(linear_transfer_ref, soul_bound_to);

    object::disable_ungated_transfer(&transfer_ref);

    let properties = property_map::prepare_input(vector[], vector[], vector[]);
    property_map::init(&constructor_ref, properties);
    property_map::add_typed(
        &property_mutator_ref,
        string::utf8(b"profile_uid"),
        string::utf8(profile_uid)
    );

    let profile_token = ProfileToken {
        mutator_ref,
        burn_ref,
        property_mutator_ref,
        base_uri
    };

    move_to(&object_signer, profile_token);
}
```

Mints a profile token as an NFT, binds it to the provided address, and initializes its properties.

### `to_string`

```move
fun to_string(value: u64): String {
    if (value == 0) {
        return string::utf8(b"0");
    }
    let buffer = vector::empty<u8>();
    while (value != 0) {
        vector::push_back(&mut buffer, ((48 + value % 10) as u8));
        value = value / 10;
    }
    vector::reverse(&mut buffer);
    string::utf8(buffer)
}
```

Converts a `u64` value to its ASCII string representation.

### `create_profile`

```move
public fun create_profile(creator: &signer, _token_uri: String) acquires ProfileStore {
    let profile_store = borrow_global_mut<ProfileStore>(@chainmate);
    let base_score = randomness::u64_range(50, 100);
    let address = signer::address_of(creator);
    let profile_UID: vector<u8> = hash::sha2_256(bcs::to_bytes(&address));
    let index = profile_store.current_index_id + 1;

    let profile = Profile {
        id: profile_UID,
        profile_score: base_score,
        age: 0,
        bio: string::utf8(b""),
    };

    let match_handler = MatchHandler {
        all_matches: table::new(),
        match_event: account::new_event_handle<MatchEvent>(creator),
        unmatch_event: account::new_event_handle<UnmatchEvent>(creator),
    };

    profile_store.current_index_id = index;
    vector::push_back(&mut profile_store.profiles, copy profile);

    mint_profile_token(
        creator,
        index,
        _token_uri,
        signer::address_of(creator),
        profile_UID,
    );

    move_to(creator, profile);
    move_to(creator, match_handler);
}
```

Creates a user profile, generates a unique profile ID, assigns a random base score, and mints a profile token for the user.

### `create_match`

```move
public fun create_match(user1: address, user2: address) acquires MatchTable, Profile, MatchHandler {
    assert!(exists<MatchTable>(@chainmate), 2);

    let match_table = borrow_global_mut<MatchTable>(@chainmate);
    let match_id = match_table.current_match_id + 1;
    let new_match = Match {
        user1,
        user2,
    };
    table::add(&mut match_table.matches, match_id, new_match);

    {
        let user1_profile = borrow_global_mut<Profile>(user1);
        let user1_matches = borrow_global_mut<MatchHandler>(user1);
        if (user1_profile.profile_score != 0) {
            user1_profile.profile_score = user1_profile.profile_score - 5;
        } else {
            user1_profile.profile_score = 0;
        }
        table::add(&mut user1_matches.all_matches, user2, match_id);
    }

    {
        let user2_profile = borrow_global_mut<Profile>(user2);
        let user2_matches = borrow_global_mut<MatchHandler>(user2);
        if (user2_profile.profile_score != 0) {
            user2_profile.profile_score = user2_profile.profile_score - 5;
        } else {
            user2_profile.profile_score = 0;
        }
        event::emit_event<MatchEvent>(&mut user2_matches.match_event, MatchEvent {
            match_id,
        });
        table

::add(&mut user2_matches.all_matches, user1, match_id);
    }
}
```

Creates a match between two users, updates their profile scores, and emits a `MatchEvent`.

### `unmatch`

```move
public fun unmatch(user1: address, user2: address) acquires MatchTable, Profile, MatchHandler {
    let match_table = borrow_global_mut<MatchTable>(@chainmate);

    {
        let user1_profile = borrow_global_mut<Profile>(user1);
        let user1_matches = borrow_global_mut<MatchHandler>(user1);
        let _match_id = table::remove(&mut user1_matches.all_matches, user2);
        let _match_id = table::remove(&mut match_table.matches, _match_id);
        user1_profile.profile_score = user1_profile.profile_score + 2;
    }

    {
        let user2_profile = borrow_global_mut<Profile>(user2);
        let user2_matches = borrow_global_mut<MatchHandler>(user2);
        let _match_id = table::remove(&mut user2_matches.all_matches, user1);
        event::emit_event<UnmatchEvent>(&mut user2_matches.unmatch_event, UnmatchEvent { match_id: _match_id });
        user2_profile.profile_score = user2_profile.profile_score + 2;
    }
}
```

Removes a match between two users, updates their profile scores, and emits an `UnmatchEvent`.

### `left_swipe_score_update` and `right_swipe_score_update`

```move
public fun left_swipe_score_update(user: address, score: u64) acquires Profile {
    let profile = borrow_global_mut<Profile>(user);
    if (profile.profile_score > score) {
        profile.profile_score = profile.profile_score - score;
    } else {
        profile.profile_score = 0;
    }
}

public fun right_swipe_score_update(user: address, score: u64) acquires Profile {
    let profile = borrow_global_mut<Profile>(user);
    profile.profile_score = profile.profile_score + score;
}
```

These functions update a user's profile score based on left or right swipes.

### `get_profiles`

```move
public fun get_profiles(): vector<Profile> acquires ProfileStore {
    let profile_store = borrow_global_mut<ProfileStore>(@chainmate);
    profile_store.profiles
}
```

Returns all user profiles stored in the `ProfileStore`.

---

## **Frontend work in progress**⚠️
