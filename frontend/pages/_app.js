import NavBar from "../components/NavBar";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <NavBar />
      <div style={{ padding: 16 }}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
