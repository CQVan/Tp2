"use client"

import React, { useState, useEffect } from 'react';
import { Sword, Trophy, Zap, Users, Code, Target, ArrowRight, Menu, X, ChevronDown, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Navigation = ({ mobileMenuOpen, setMobileMenuOpen }) => (
  <nav className="sticky top-0 z-50 px-6 py-4 bg-white border-b shadow-sm">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Code className="w-8 h-8 text-blue-600" />
        <div>
          <div className="text-2xl font-bold text-gray-900">Tp2</div>
          <div className="text-xs text-gray-500 -mt-1">Thee Project Project</div>
        </div>
      </div>
      
      <div className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-gray-700 hover:text-blue-600 transition">Features</a>
        <a href="#how" className="text-gray-700 hover:text-blue-600 transition">How It Works</a>
        <a href="#ranks" className="text-gray-700 hover:text-blue-600 transition">Ranks</a>
        <Button onClick={() => window.location.href = '/login'}>Login</Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X /> : <Menu />}
      </Button>
    </div>
    {mobileMenuOpen && (
      <div className="md:hidden mt-4 pb-4 space-y-4 border-t pt-4">
        <a href="#features" className="block text-gray-700 hover:text-blue-600">Features</a>
        <a href="#how" className="block text-gray-700 hover:text-blue-600">How It Works</a>
        <a href="#ranks" className="block text-gray-700 hover:text-blue-600">Ranks</a>
        <Button className="w-full" onClick={() => window.location.href = '/login'}>Start Battling</Button>
      </div>
    )}
  </nav>
);

const HeroSection = ({ showScrollArrow, scrollToFeatures }) => (
  <section className="max-w-7xl mx-auto px-6 py-20">
    <div className="text-center space-y-8">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 font-medium">
        <Zap className="w-4 h-4" />
        <span>Competitive Coding Reimagined</span>
      </div>
      
      <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">
        Battle. Code. Conquer.
      </h1>
      
      <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
        The ultimate ranked PvP platform where developers compete in real-time coding battles. 
        Think LeetCode meets competitive esports.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Button size="lg" className="text-lg py-8 px-8" onClick={() => window.location.href = '/login'}>
          Enter the Arena
        </Button>
      </div>
      <div 
        className={`pt-16 animate-bounce cursor-pointer transition-opacity duration-500 ${showScrollArrow ? 'opacity-100' : 'opacity-0'}`}
        onClick={scrollToFeatures}
      >
        <ChevronDown className="w-12 h-12 mx-auto text-gray-400" />
      </div>
    </div>
  </section>
);

const FeaturesSection = () => {
  const features = [
    {
      icon: Sword,
      title: "Real-Time PvP Battles",
      description: "Challenge opponents in head-to-head coding duels. Race against the clock and each other to solve algorithmic puzzles."
    },
    {
      icon: Trophy,
      title: "Ranked Competitive System",
      description: "Climb the leaderboard with ELO-based matchmaking. Prove your skills and reach the top ranks."
    },
    {
      icon: Zap,
      title: "Instant Feedback",
      description: "Get real-time code execution and immediate results. Know exactly where you stand in every match."
    }
  ];

  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-20">
      <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-900">
        Why Tp2?
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature, idx) => (
          <Card
            key={idx}
            className="group transition-all duration-300 hover:shadow-lg hover:border-blue-500 cursor-pointer"
          >
            <CardHeader>
              <feature.icon className="w-12 h-12 mb-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              <CardTitle className="text-2xl">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                {feature.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  const steps = [
    { num: "01", title: "Queue Up", desc: "Enter ranked matchmaking and get paired with opponents at your skill level" },
    { num: "02", title: "Get Problem", desc: "A random algorithmic challenge is selected from the database for both players" },
    { num: "03", title: "Code Fast", desc: "Race to solve the problem correctly. Speed and accuracy both matter" },
    { num: "04", title: "Climb Ranks", desc: "Win to gain ELO, unlock rewards, and dominate the leaderboard" }
  ];

  return (
    <section id="how" className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-900">
          How It Works
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((step, idx) => (
            <Card key={idx} className="relative hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="text-6xl font-bold text-gray-200 mb-4">{step.num}</div>
                <CardTitle className="text-xl">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  {step.desc}
                </CardDescription>
              </CardContent>
              {idx < 3 && (
                <div className="hidden md:block absolute top-1/2 -right-3 text-gray-300 transform -translate-y-1/2">
                  <ArrowRight className="w-6 h-6" />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

const RanksSection = () => {
  const ranks = [
    { name: "Bronze", color: "from-orange-700 to-orange-900", icon: Target },
    { name: "Silver", color: "from-gray-400 to-gray-600", icon: Target },
    { name: "Gold", color: "from-yellow-400 to-yellow-600", icon: Trophy },
    { name: "Platinum", color: "from-cyan-400 to-blue-600", icon: Trophy },
    { name: "Diamond", color: "from-purple-400 to-pink-600", icon: Sword },
    { name: "Champion", color: "from-yellow-500 to-amber-600", icon: Crown }
  ];

  return (
    <section id="ranks" className="max-w-7xl mx-auto px-6 py-20">
      <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-900">
        Rank System
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {ranks.map((rank, idx) => (
          <Card
            key={idx}
            className="hover:shadow-lg transition-all hover:scale-105 text-center"
          >
            <CardContent className="pt-6 pb-6">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${rank.color} flex items-center justify-center shadow-md`}>
                <rank.icon className="w-8 h-8 text-white" />
              </div>
              <div className="font-bold text-lg text-gray-900">{rank.name}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

const CTASection = () => (
  <section className="max-w-5xl mx-auto px-6 py-20">
    <Card className="shadow-xl">
      <CardContent className="p-8 md:p-12 text-center flex flex-col items-center gap-8">
        <Users className="w-16 h-16 text-blue-600" />
        <div className="flex flex-col gap-2">
          <CardTitle className="text-3xl md:text-4xl">Ready to Prove Yourself?</CardTitle>
          <CardDescription className="text-lg md:text-xl text-gray-600">
            Join thousands of developers competing in the most intense coding battles
          </CardDescription>
        </div>
        
        <div className="w-full max-w-md space-y-4">
          <Button className="w-full text-xl py-8" onClick={() => window.location.href = '/login'}>
            Start Your Journey
          </Button>
        </div>
      </CardContent>
    </Card>
  </section>
);

const Footer = () => (
  <footer className="border-t bg-white mt-20">
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Code className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-gray-900">Tp2</span>
          <span className="text-gray-400">•</span>
          <span className="text-sm text-gray-500">Thee Project Project</span>
        </div>
        <div className="flex gap-8 text-sm text-gray-600">
          <a href="#" className="hover:text-blue-600 transition">About</a>
          <a href="#" className="hover:text-blue-600 transition">Discord</a>
          <a href="#" className="hover:text-blue-600 transition">Docs</a>
          <a href="#" className="hover:text-blue-600 transition">Contact</a>
        </div>
      </div>
      <div className="text-center mt-8 text-sm text-gray-500">
        © 2025 Tp2. Battle, Code, Conquer.
      </div>
    </div>
  </footer>
);

export default function Tp2Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollArrow, setShowScrollArrow] = useState(true);
  
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollArrow(window.scrollY < 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <HeroSection showScrollArrow={showScrollArrow} scrollToFeatures={scrollToFeatures} />
      <FeaturesSection />
      <HowItWorksSection />
      <RanksSection />
      <CTASection />
      <Footer />
    </div>
  );
}