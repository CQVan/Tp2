import { Suspense } from "react";
import MatchPage from "./editor";

export default function Page({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MatchPage />
    </Suspense>
  );
}