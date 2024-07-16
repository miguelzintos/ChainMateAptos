import dotenv from 'dotenv';
dotenv.config();

export default {
  networkUrl: 'https://fullnode.devnet.aptoslabs.com',
  moduleAddress: '0xd16e1a31b9f8ef09dcdf8f9b7c792cecff1dc1421e54d773ef010b3be4de7501', // Replace with the actual address of your Move module
  privateKey: process.env.APTOS_PRIVATE_KEY as string,
};