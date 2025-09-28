
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800 p-8">
      <Card className="max-w-2xl w-full flex flex-col items-center gap-8 py-16 px-8 bg-white dark:bg-black border border-gray-700 shadow-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center text-black dark:text-white">TheProjectProject</h1>
        <p className="text-lg sm:text-xl text-center text-gray-700 dark:text-gray-300 max-w-xl">
          The ultimate real-time competitive quiz platform. Match up, test your knowledge, and climb the leaderboard!
        </p>
        <a href="/login" className="w-full flex justify-center">
          <Button className="mt-4 px-8 py-4 text-xl font-semibold w-full sm:w-auto" size="lg">
            Get Started
          </Button>
        </a>
      </Card>
    </div>
  );
}
