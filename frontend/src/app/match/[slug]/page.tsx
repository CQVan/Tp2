import { Suspense } from "react";
import MatchPage from "./editor";

export default function Page({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<LoadingScreen/>}>
      <MatchPage />
    </Suspense>
  );
}

export function LoadingScreen(props: { status?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm z-50">
      <div className="bg-gray-900/80 p-6 rounded-xl shadow-lg text-center text-white">
        <h1 className="text-xl font-semibold">Loading</h1>
        {props.status && <h2 className="mt-2">{props.status}</h2>}
      </div>
    </div>
  );
}
