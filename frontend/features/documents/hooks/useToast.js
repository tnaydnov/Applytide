export default function useToast() {
  return {
    success: (m) => console.log("[toast:success]", m),
    error: (m) => console.error("[toast:error]", m),
    info: (m) => console.log("[toast:info]", m),
  };
}
