// Deprecated standalone register page. Redirect to consolidated login/signup.
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/login',
      permanent: false,
    }
  };
}

export default function RegisterRedirect() {
  return null; // Immediately redirected server-side
}
