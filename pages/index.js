import Head from 'next/head';
import BlockDropGame from '../components/BlockDropGame';

export default function Home() {
  return (
    <>
      <Head>
        <title>Block Drop - Web3 Puzzle Game</title>
        <meta name="description" content="Play Block Drop puzzle game with blockchain leaderboard on Base" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <BlockDropGame />
    </>
  );
}
