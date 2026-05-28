import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import TickerBar from "@/components/TickerBar";
import { AuthProvider } from "@/contexts/AuthContext";
import { WalletContextProvider } from "@/contexts/WalletContext";
import {
	HeadContent,
	Outlet,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import "../index.css";
import { Buffer } from 'buffer';


window.Buffer = Buffer;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "Redcircle - Turn viral Reddit posts to tradeable markets powered by Solana",
			},
			{
				name: "description",
				content: "Redcircle - Turn viral Reddit posts into tradeable markets powered by Solana blockchain.",
			},
		],
		links: [
			{
				rel: "icon",
				type: "image/png",
				href: "/favicon-circle.png",
			},
		],
	}),
});

function RootComponent() {
	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<WalletContextProvider>
					<AuthProvider>
						<Navbar />
						<TickerBar />
						<div className="pt-24">
							<Outlet />
						</div>
						<Toaster richColors />
					</AuthProvider>
				</WalletContextProvider>
			</ThemeProvider>
			{/* <TanStackRouterDevtools position="bottom-left" /> */}
		</>
	);
}
