<template>
  <div class="bg-gradient-to-br from-black via-gray-900 to-emerald-950 overflow-x-hidden">

    <!-- Fixed Navigation -->
    <nav class="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 bg-black/30 backdrop-blur-md border-b border-white/5" style="padding-top: max(1rem, env(safe-area-inset-top));">
      <div class="max-w-7xl mx-auto flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <img src="/favicon.png" alt="Echobit" class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain" />
          <span class="text-xl sm:text-2xl font-bold text-white">Echobit</span>
        </div>
        <div class="flex items-center space-x-1 sm:space-x-4">
          <a href="#features" class="text-white/70 hover:text-white transition px-3 py-2 text-sm hidden sm:block">Features</a>
          <a href="/pricing" class="text-white/70 hover:text-white transition px-3 py-2 text-sm hidden sm:block">Pricing</a>
          <a href="/contact" class="text-white/70 hover:text-white transition px-3 py-2 text-sm hidden sm:block">Contact</a>
          <template v-if="isLoggedIn">
            <a href="/dashboard" class="bg-emerald-500 text-white px-4 sm:px-6 py-2 rounded-full font-semibold hover:bg-emerald-400 transition shadow-lg text-sm sm:text-base flex items-center gap-2">
              Dashboard
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </a>
          </template>
          <template v-else>
            <a href="/login" class="text-white/80 hover:text-white transition px-3 sm:px-4 py-2 text-sm sm:text-base">Sign In</a>
            <a href="/register" class="bg-emerald-500 text-white px-4 sm:px-6 py-2 rounded-full font-semibold hover:bg-emerald-400 transition shadow-lg text-sm sm:text-base">
              Get Started
            </a>
          </template>
        </div>
      </div>
    </nav>

    <!-- ─── Hero ─── -->
    <section class="relative min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20 pb-16 overflow-hidden fade-up" data-anim>
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-72 sm:w-[28rem] h-72 sm:h-[28rem] bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse"></div>
        <div class="absolute -bottom-40 -left-40 w-72 sm:w-[28rem] h-72 sm:h-[28rem] bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse delay-1000"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-[32rem] h-80 sm:h-[32rem] bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse delay-500"></div>
      </div>

      <div class="relative z-10 max-w-4xl mx-auto text-center">
        <div class="inline-flex items-center px-3 sm:px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/80 text-xs sm:text-sm mb-6 border border-white/10">
          <span class="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
          AI-Powered Meeting Companion · Now with 20+ Indian Languages
        </div>

        <h1 class="text-4xl sm:text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Record. Transcribe.
          <span class="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent block sm:inline"> Summarise.</span>
        </h1>

        <p class="text-base sm:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
          Echobit turns your meetings and lectures into transcripts, summaries, action items,
          and professional meeting minutes — automatically, in seconds.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12">
          <a :href="isLoggedIn ? '/dashboard' : '/register'" class="w-full sm:w-auto group bg-emerald-500 text-white px-8 py-4 rounded-full font-semibold text-base sm:text-lg hover:bg-emerald-400 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 flex items-center justify-center space-x-2">
            <span>{{ isLoggedIn ? 'Go to Dashboard' : 'Start for Free' }}</span>
            <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <a href="/pricing" class="w-full sm:w-auto text-white/80 hover:text-white px-8 py-4 rounded-full font-semibold text-base sm:text-lg border border-white/20 hover:border-white/50 transition flex items-center justify-center">
            View Pricing
          </a>
        </div>

        <!-- Trust badges -->
        <div class="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-white/40 text-xs sm:text-sm">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            No credit card required
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            Free plan forever
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            Android app included
          </div>
        </div>
      </div>

      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30 text-xs animate-bounce">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>

    <!-- ─── Stats Bar ─── -->
    <section class="py-12 px-4 sm:px-6 border-y border-white/5 bg-white/[0.02] fade-up" data-anim>
      <div class="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
        <div>
          <p class="text-3xl sm:text-4xl font-bold text-emerald-400 mb-1">20+</p>
          <p class="text-white/50 text-sm">Indian Languages</p>
        </div>
        <div>
          <p class="text-3xl sm:text-4xl font-bold text-emerald-400 mb-1">3h</p>
          <p class="text-white/50 text-sm">Max Recording Length</p>
        </div>
        <div>
          <p class="text-3xl sm:text-4xl font-bold text-emerald-400 mb-1">99%</p>
          <p class="text-white/50 text-sm">Transcription Accuracy</p>
        </div>
        <div>
          <p class="text-3xl sm:text-4xl font-bold text-emerald-400 mb-1">Free</p>
          <p class="text-white/50 text-sm">Plan Forever</p>
        </div>
      </div>
    </section>

    <!-- ─── How It Works ─── -->
    <section class="py-24 px-4 sm:px-6 fade-up" data-anim>
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <p class="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Simple Process</p>
          <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white">How Echobit works</h2>
          <p class="text-white/50 mt-4 max-w-xl mx-auto">Four steps from recording to polished meeting notes</p>
        </div>

        <div class="relative">
          <!-- Connector line (desktop) -->
          <div class="hidden sm:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-8">
            <div v-for="(step, i) in howItWorks" :key="i" class="flex flex-col items-center text-center relative">
              <div class="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 relative z-10" :class="step.bg">
                <span class="absolute -top-2 -right-2 w-6 h-6 bg-white/5 backdrop-blur-sm rounded-full text-white text-xs font-bold flex items-center justify-center">{{ i + 1 }}</span>
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="step.icon" />
                </svg>
              </div>
              <h3 class="text-white font-semibold text-lg mb-2">{{ step.title }}</h3>
              <p class="text-white/50 text-sm leading-relaxed">{{ step.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Features ─── -->
    <section id="features" class="py-24 px-4 sm:px-6 border-t border-white/5 fade-up" data-anim>
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-16">
          <p class="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Features</p>
          <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white">Everything you need</h2>
          <p class="text-white/50 mt-4 max-w-xl mx-auto">From recording to reports, Echobit handles the entire meeting lifecycle</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="feat in features" :key="feat.title"
            class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-emerald-500/40 hover:bg-white/10 transition-all duration-300 group">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4" :class="feat.iconBg">
              <svg class="w-6 h-6" :class="feat.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="feat.icon" />
              </svg>
            </div>
            <h3 class="text-white font-semibold text-lg mb-2">{{ feat.title }}</h3>
            <p class="text-white/55 text-sm leading-relaxed">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Language Support ─── -->
    <section class="py-24 px-4 sm:px-6 border-t border-white/5 fade-up" data-anim>
      <div class="max-w-5xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p class="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Indian Language Support</p>
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">
              Transcribe in your
              <span class="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent"> mother tongue</span>
            </h2>
            <p class="text-white/60 text-base leading-relaxed mb-6">
              Echobit supports transcription and summaries in 10+ Indian languages with native-level accuracy.
            </p>
            <div class="flex flex-wrap gap-2 mb-8">
              <span v-for="lang in languages" :key="lang"
                class="px-3 py-1.5 bg-white/10 border border-white/10 rounded-full text-white/70 text-sm hover:border-emerald-500/40 hover:text-white transition">
                {{ lang }}
              </span>
            </div>
            <a href="/pricing" class="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-full font-semibold transition shadow-lg shadow-emerald-500/20">
              Get language support
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </a>
          </div>

          <div class="bg-white/5 border border-white/10 rounded-3xl p-8">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 3.938A9.004 9.004 0 0112 9c2.485 0 4.74 1.007 6.373 2.638M12 9a6.003 6.003 0 00-5.879 4.75M12 15a3 3 0 110-6 3 3 0 010 6z"/></svg>
              </div>
              <div>
                <p class="text-white font-semibold text-sm">AI Transcript</p>
                <p class="text-white/40 text-xs">Hindi · 2 minutes ago</p>
              </div>
            </div>
            <div class="space-y-3">
              <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p class="text-white/80 text-sm leading-relaxed">"आज की मीटिंग में हमने Q3 टारगेट्स पर चर्चा की। मार्केटिंग टीम अगले हफ्ते नई कैंपेन लॉन्च करेगी।"</p>
              </div>
              <div class="flex items-center gap-2 text-xs text-white/40">
                <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                Transcribed · 98.4% confidence
              </div>
            </div>
            <div class="mt-5 pt-5 border-t border-white/10">
              <p class="text-white/50 text-xs mb-3 font-medium uppercase tracking-wider">Auto-generated Summary</p>
              <p class="text-white/70 text-sm leading-relaxed">Q3 targets discussed. Marketing team to launch new campaign next week.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Use Cases ─── -->
    <section class="py-24 px-4 sm:px-6 border-t border-white/5 fade-up" data-anim>  
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-16">
          <p class="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Who Uses Echobit</p>
          <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white">Built for every professional</h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="uc in useCases" :key="uc.title"
            class="relative bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/25 transition-all duration-300 overflow-hidden group">
            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" :class="uc.hoverGrad"></div>
            <div class="relative z-10">
              <div class="text-3xl mb-4">{{ uc.emoji }}</div>
              <h3 class="text-white font-semibold text-lg mb-2">{{ uc.title }}</h3>
              <p class="text-white/55 text-sm leading-relaxed mb-4">{{ uc.desc }}</p>
              <ul class="space-y-1.5">
                <li v-for="point in uc.points" :key="point" class="flex items-start gap-2 text-white/50 text-xs">
                  <svg class="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  {{ point }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Testimonials ─── -->
    <section class="py-24 px-4 sm:px-6 border-t border-white/5 fade-up" data-anim>
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <p class="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Testimonials</p>
          <h2 class="text-3xl sm:text-4xl font-bold text-white">What our users say</h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div v-for="t in testimonials" :key="t.name"
            class="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div class="flex gap-1">
              <svg v-for="n in 5" :key="n" class="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
            <p class="text-white/70 text-sm leading-relaxed flex-1">"{{ t.quote }}"</p>
            <div class="flex items-center gap-3 pt-2 border-t border-white/10">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" :class="t.avatarBg">
                {{ t.name[0] }}
              </div>
              <div>
                <p class="text-white text-sm font-medium">{{ t.name }}</p>
                <p class="text-white/40 text-xs">{{ t.role }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Pricing Teaser ─── -->
    <section class="py-24 px-4 sm:px-6 border-t border-white/5 fade-up" data-anim>
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
          <p class="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
          <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Simple, transparent plans</h2>
          <p class="text-white/50">Start free. Upgrade when you need more.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div class="bg-white/5 border border-white/10 rounded-2xl p-7 flex flex-col">
            <h3 class="text-white font-bold text-xl mb-1">Free</h3>
            <p class="text-white/40 text-sm mb-5">No card needed</p>
            <p class="text-4xl font-bold text-white mb-6">₹0<span class="text-white/40 text-base font-normal">/mo</span></p>
            <ul class="space-y-2.5 flex-1 mb-7">
              <li v-for="f in freeTeaserFeatures" :key="f" class="flex items-center gap-2.5 text-white/60 text-sm">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                {{ f }}
              </li>
            </ul>
            <a :href="isLoggedIn ? '/dashboard' : '/register'" class="block text-center py-3 rounded-xl border border-white/20 text-white/80 font-semibold hover:bg-white/10 transition">
              {{ isLoggedIn ? 'Go to Dashboard' : 'Get Started' }}
            </a>
          </div>

          <div class="bg-gradient-to-b from-emerald-500/20 to-emerald-600/10 border border-emerald-500/40 rounded-2xl p-7 flex flex-col relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-bl-xl">Most Popular</div>
            <h3 class="text-white font-bold text-xl mb-1">Pro</h3>
            <p class="text-white/40 text-sm mb-5">For power users</p>
            <p class="text-4xl font-bold text-white mb-6">₹499<span class="text-white/40 text-base font-normal">/mo</span></p>
            <ul class="space-y-2.5 flex-1 mb-7">
              <li v-for="f in proTeaserFeatures" :key="f" class="flex items-center gap-2.5 text-white/80 text-sm">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                {{ f }}
              </li>
            </ul>
            <a href="/pricing" class="block text-center py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition shadow-lg shadow-emerald-500/30">
              See Full Pricing
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── CTA Banner ─── -->
    <section class="py-24 px-4 sm:px-6 border-t border-white/5 fade-up" data-anim>
      <div class="max-w-3xl mx-auto text-center">
        <div class="bg-gradient-to-br from-emerald-500/15 to-green-600/5 border border-emerald-500/20 rounded-3xl p-12 relative overflow-hidden">
          <div class="absolute inset-0 pointer-events-none overflow-hidden">
            <div class="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            <div class="absolute -bottom-20 -left-20 w-64 h-64 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          </div>
          <div class="relative z-10">
            <img src="/favicon.png" alt="Echobit" class="w-14 h-14 rounded-2xl mx-auto mb-6 shadow-xl object-contain" />
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Start your first recording today</h2>
            <p class="text-white/60 mb-8 max-w-md mx-auto">No credit card. No setup. Just record and let Echobit do the rest.</p>
            <a :href="isLoggedIn ? '/dashboard' : '/register'"
              class="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-full font-semibold text-lg transition shadow-xl shadow-emerald-500/30">
              {{ isLoggedIn ? 'Go to Dashboard' : 'Create Free Account' }}
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Footer ─── -->
    <footer class="border-t border-white/5 px-4 sm:px-6 py-10">
      <div class="max-w-7xl mx-auto">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-10 mb-10">
          <div class="sm:col-span-2">
            <div class="flex items-center space-x-2 mb-4">
              <img src="/favicon.png" alt="Echobit" class="w-9 h-9 rounded-xl object-contain" />
              <span class="text-xl font-bold text-white">Echobit</span>
            </div>
            <p class="text-white/40 text-sm leading-relaxed max-w-xs">
              AI-powered meeting companion by <span class="text-white/60">Devmorphix</span>. Record, transcribe, and summarise — hands-free.
            </p>
          </div>
          <div>
            <p class="text-white/70 font-semibold text-sm mb-4">Product</p>
            <div class="flex flex-col gap-3 text-white/40 text-sm">
              <a href="/pricing" class="hover:text-white/70 transition">Pricing</a>
              <template v-if="isLoggedIn">
                <a href="/dashboard" class="hover:text-white/70 transition">Dashboard</a>
              </template>
              <template v-else>
                <a href="/login" class="hover:text-white/70 transition">Sign In</a>
                <a href="/register" class="hover:text-white/70 transition">Create Account</a>
              </template>
            </div>
          </div>
          <div>
            <p class="text-white/70 font-semibold text-sm mb-4">Legal</p>
            <div class="flex flex-col gap-3 text-white/40 text-sm">
              <a href="/privacy-policy" class="hover:text-white/70 transition">Privacy Policy</a>
              <a href="/contact" class="hover:text-white/70 transition">Contact Us</a>
              <a href="/request-deletion" class="hover:text-white/70 transition">Data Deletion</a>
            </div>
          </div>
        </div>
        <div class="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p class="text-white/30 text-sm">© {{ new Date().getFullYear() }} Devmorphix. All rights reserved.</p>
          <p class="text-white/20 text-xs">Echobit — AI Meeting Companion</p>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

// Marketing site has no auth context — always render the logged-out CTAs.
const isLoggedIn = false;

const howItWorks = [
  { title: 'Record', desc: 'Open Echobit on your phone or browser and hit record. Runs in the background so you stay fully present.', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', bg: 'bg-gradient-to-br from-emerald-500 to-green-600' },
  { title: 'Transcribe', desc: 'AI transcribes your audio in English or Indian languages — Hindi, Tamil, Telugu, and more.', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', bg: 'bg-gradient-to-br from-teal-500 to-emerald-600' },
  { title: 'Summarise', desc: 'Gemini AI generates a clean summary with action items and key decisions.', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', bg: 'bg-gradient-to-br from-green-500 to-teal-600' },
  { title: 'Export', desc: 'Download professional meeting minutes as PDF or share directly from the app.', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4', bg: 'bg-gradient-to-br from-emerald-600 to-green-700' },
];

const features = [
  { title: 'Background Recording', desc: 'Keep recording while using other apps. Echobit runs silently in the background on Android.', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
  { title: 'AI Transcription', desc: 'High-accuracy transcription in English and Indian languages. Handles accents, crosstalk, and background noise.', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z', iconBg: 'bg-green-500/15', iconColor: 'text-green-400' },
  { title: 'Smart Summaries', desc: 'Google Gemini extracts the most important points into a concise, readable summary.', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', iconBg: 'bg-teal-500/15', iconColor: 'text-teal-400' },
  { title: 'Meeting Minutes', desc: 'Auto-generate professional meeting minutes with attendees, decisions, and action items — PDF ready.', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
  { title: 'Action Item Extraction', desc: 'Automatically identifies tasks, owners, and deadlines from your conversation.', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', iconBg: 'bg-green-500/15', iconColor: 'text-green-400' },
  { title: 'Custom PDF Templates', desc: 'Choose from templates or build your own. Export branded meeting minutes your way.', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z', iconBg: 'bg-teal-500/15', iconColor: 'text-teal-400' },
];

const languages = ['Hindi', 'Tamil', 'Telugu', 'Bengali', 'Kannada', 'Malayalam', 'Marathi', 'Gujarati', 'Punjabi', 'Odia', 'English'];

const useCases = [
  {
    emoji: '🏢',
    title: 'Business Teams',
    desc: 'Never miss a decision or follow-up from your team meetings.',
    hoverGrad: 'bg-gradient-to-br from-emerald-500/10 to-transparent',
    points: ['Board meeting minutes', 'Client call notes', 'Sprint retrospectives'],
  },
  {
    emoji: '🎓',
    title: 'Students',
    desc: 'Record lectures and turn them into study notes automatically.',
    hoverGrad: 'bg-gradient-to-br from-blue-500/10 to-transparent',
    points: ['Lecture transcripts', 'Study summaries', 'Group project notes'],
  },
  {
    emoji: '🏥',
    title: 'Healthcare',
    desc: 'Document patient consultations and team briefings with ease.',
    hoverGrad: 'bg-gradient-to-br from-red-500/10 to-transparent',
    points: ['Patient consultation notes', 'Ward round summaries', 'Case conference logs'],
  },
  {
    emoji: '🎙️',
    title: 'Journalists',
    desc: 'Transcribe interviews and press conferences in seconds.',
    hoverGrad: 'bg-gradient-to-br from-purple-500/10 to-transparent',
    points: ['Interview transcripts', 'Press conference notes', 'Multi-language support'],
  },
];

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Product Manager, Bangalore',
    quote: 'Echobit has completely changed how I run sprint meetings. The action item extraction alone saves me 30 minutes every week.',
    avatarBg: 'bg-emerald-600',
  },
  {
    name: 'Arjun Nair',
    role: 'Medical Resident, Chennai',
    quote: 'I use it for ward rounds in Malayalam. The accuracy is outstanding — it even gets medical terms right.',
    avatarBg: 'bg-teal-600',
  },
  {
    name: 'Sneha Patel',
    role: 'MBA Student, Ahmedabad',
    quote: 'Recording lectures and getting summaries in Gujarati is a game changer. I study from the transcript instead of rewatching videos.',
    avatarBg: 'bg-green-600',
  },
];

const freeTeaserFeatures = ['3 recordings/month', '20 min max', 'English + Malayalam', 'AI transcription', 'AI summary', '1 GB storage'];
const proTeaserFeatures = ['40 recordings/month', '2 hours max', '15+ languages', 'Meeting minutes', 'Action items', 'PDF export', '10 GB storage'];

// Intersection observer for scroll animations
let observer;
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('fade-up-visible'); }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('[data-anim]').forEach(el => observer.observe(el));
});
onUnmounted(() => observer && observer.disconnect());
</script>

<style scoped>
.fade-up {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}
.fade-up-visible {
  opacity: 1;
  transform: translateY(0);
}
.delay-500  { animation-delay: 500ms; }
.delay-1000 { animation-delay: 1000ms; }
</style>
