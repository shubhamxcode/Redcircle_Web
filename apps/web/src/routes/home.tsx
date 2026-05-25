import { BackgroundPaths } from "@/components/ui/background-paths";
import { AnimatedFooter } from "@/components/ui/animated-footer";
import FeaturesParallax from "@/components/FeaturesParallax";
import { createFileRoute } from "@tanstack/react-router";
import { WorldMapDemo } from "@/components/ui/world-map-demo";
import RedCircleCards from "@/components/RedCircleCards";
// import Testimonials from "@/components/ui/testimonials";

export const Route = createFileRoute("/home")({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<div className="relative flex min-h-screen flex-col">
			<BackgroundPaths
				title="Turn Viral Posts Into Digital Assets"
				subtitle="RedCircle tokenizes Reddit content on Solana blockchain, creating a new economy around social media virality."
			/>
			<WorldMapDemo />
			<RedCircleCards />
			<FeaturesParallax />
			{/* <Testimonials /> */}
			<AnimatedFooter />
		</div>
	);
}
