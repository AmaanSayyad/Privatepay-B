import { NextUIProvider } from "@nextui-org/react";
import AuthProvider from "./AuthProvider.jsx";
import { SWRConfig } from "swr";
import UserProvider from "./UserProvider.jsx";
import { ConnectKitProvider } from "./ConnectKitProvider.jsx";


export default function RootProvider({ children }) {
  return (
    <SWRConfig value={{ shouldRetryOnError: false, revalidateOnFocus: false }}>
      <NextUIProvider>
        <ConnectKitProvider>
          <AuthProvider>
            <UserProvider>
              {children}
            </UserProvider>
          </AuthProvider>
        </ConnectKitProvider>
      </NextUIProvider>

    </SWRConfig>
  );
}
