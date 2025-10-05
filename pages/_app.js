import { Web3Provider } from '../contexts/Web3Context';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <Web3Provider>
      <Component {...pageProps} />
    </Web3Provider>
  );
}
