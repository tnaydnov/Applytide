export default function useToast() {
  return {
    success: (m) => { /* Production: console removed */ },
    error: (m) => console.error("[toast:error]", m),
    info: (m) => { /* Production: console removed */ },
  };
}
