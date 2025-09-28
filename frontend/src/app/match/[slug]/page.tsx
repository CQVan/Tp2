import { Suspense } from "react";
import MatchPage from "./editor";
import { Card } from "@/components/ui/card";

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
      <Card className="p-6 rounded-xl shadow-lg text-center">
        <h1 className="text-xl font-semibold">Loading</h1>
        {props.status && <h2 className="mt-2">{props.status}</h2>}
      </Card>
    </div>
  );
}
