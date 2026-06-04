<template>
  <div :class="thm.root">
    <!-- Header -->
    <header :class="thm.header">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-sm">A</div>
        <div>
          <h1 class="text-lg font-bold leading-none" :class="thm.text">Admin Panel</h1>
          <p class="text-xs mt-0.5" :class="thm.textFaint">Echobit management console</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs hidden sm:block" :class="thm.textFaint">{{ adminEmail }}</span>
        <button @click="isDark = !isDark" :class="[thm.btnNav, 'p-2']" :title="isDark ? 'Light mode' : 'Dark mode'">
          <svg v-if="isDark" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
          </svg>
        </button>
        <router-link to="/dashboard" :class="thm.btnNav">← Dashboard</router-link>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      <!-- Error -->
      <div v-if="globalError" class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
        <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        {{ globalError }}
      </div>

      <!-- Tabs -->
      <nav :class="['flex gap-1 rounded-xl p-1 w-full sm:w-fit overflow-x-auto', thm.tabBar]">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
          :class="activeTab === tab.id ? thm.tabActive : thm.tabInactive">{{ tab.label }}</button>
      </nav>

      <!-- ── OVERVIEW ── -->
      <div v-if="activeTab === 'overview'">
        <div v-if="statsLoading" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div v-for="i in 8" :key="i" :class="['h-24 rounded-2xl', thm.skeleton]"></div>
        </div>
        <template v-else-if="stats">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Users"       :value="stats.users.total"           color="emerald" :dark="isDark"/>
            <StatCard label="Verified"          :value="stats.users.verified"         color="green"   :dark="isDark"/>
            <StatCard label="Privacy Accepted"  :value="stats.users.privacyAccepted"  color="blue"    :dark="isDark"/>
            <StatCard label="New Today"         :value="stats.users.today"            color="yellow"  :dark="isDark"/>
            <StatCard label="Total Recordings"  :value="stats.recordings.total"       color="emerald" :dark="isDark"/>
            <StatCard label="Transcribed"       :value="stats.recordings.transcribed" color="green"   :dark="isDark"/>
            <StatCard label="Recordings Today"  :value="stats.recordings.today"       color="blue"    :dark="isDark"/>
            <StatCard label="This Week"         :value="stats.recordings.week"        color="yellow"  :dark="isDark"/>
          </div>
        </template>

        <div :class="[thm.card, 'overflow-hidden']">
          <div :class="['flex items-center justify-between px-5 py-4', thm.borderB]">
            <h2 class="font-semibold" :class="thm.text">Recent Activity</h2>
            <button @click="loadActivity" :class="['text-xs transition', thm.accent]">Refresh</button>
          </div>
          <div v-if="activityLoading" class="p-5 space-y-3">
            <div v-for="i in 6" :key="i" :class="['h-10 rounded-xl', thm.skeleton]"></div>
          </div>
          <div v-else-if="!activity.length" class="px-5 py-10 text-center text-sm" :class="thm.textFaint">No activity yet.</div>
          <ul v-else :class="thm.divide">
            <li v-for="(ev, i) in activity" :key="i" class="px-5 py-3 flex items-start gap-3">
              <span :class="['mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0',
                ev.type==='register' ? (isDark?'bg-emerald-900 text-emerald-300':'bg-emerald-50 text-emerald-700')
                                     : (isDark?'bg-blue-900 text-blue-300':'bg-blue-50 text-blue-700')]">
                <svg v-if="ev.type==='register'" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z"/></svg>
                <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm truncate" :class="thm.textMuted">{{ ev.text }}</p>
                <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span class="text-xs" :class="thm.textFaint">{{ fmtDate(ev.timestamp) }}</span>
                  <span v-if="ev.type==='register'&&!ev.verified" :class="['text-xs px-1.5 py-0.5 rounded', isDark?'bg-yellow-900/50 text-yellow-400':'bg-yellow-100 text-yellow-700']">unverified</span>
                  <span v-if="ev.type==='register'&&!ev.privacyAccepted" :class="['text-xs px-1.5 py-0.5 rounded', isDark?'bg-red-900/50 text-red-400':'bg-red-100 text-red-700']">no consent</span>
                  <span v-if="ev.status" :class="['text-xs px-1.5 py-0.5 rounded', statusClass(ev.status)]">{{ ev.status }}</span>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- ── USERS ── -->
      <div v-if="activeTab === 'users'" class="space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <input v-model="userSearch" @input="debouncedUserSearch" type="text" placeholder="Search name or email…"
            :class="['w-full sm:w-72 px-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition', thm.input]"/>
          <span class="text-sm" :class="thm.textFaint">{{ userTotal }} users</span>
        </div>
        <div :class="[thm.card, 'overflow-hidden']">
          <div v-if="usersLoading" class="p-5 space-y-3">
            <div v-for="i in 5" :key="i" :class="['h-12 rounded-xl', thm.skeleton]"></div>
          </div>
          <div v-else-if="!users.length" class="px-5 py-10 text-center text-sm" :class="thm.textFaint">No users found.</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr :class="[thm.borderB, 'text-left']">
                <th v-for="h in ['User','Status','Privacy','Plan','Recordings','Joined','Actions']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
              </tr></thead>
              <tbody :class="thm.divide">
                <tr v-for="u in users" :key="u._id" :class="['transition cursor-pointer', thm.rowHover]" @click="openUser(u)">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div :class="['w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0', thm.avatar]">{{ initials(u.name) }}</div>
                      <div><p class="font-medium leading-none" :class="thm.text">{{ u.name }}</p><p class="text-xs mt-0.5" :class="thm.textFaint">{{ u.email }}</p></div>
                    </div>
                  </td>
                  <td class="px-4 py-3"><span :class="['text-xs px-2 py-1 rounded-full font-medium', u.isVerified?(isDark?'bg-green-900/50 text-green-400':'bg-green-100 text-green-700'):(isDark?'bg-yellow-900/50 text-yellow-400':'bg-yellow-100 text-yellow-700')]">{{ u.isVerified?'Verified':'Unverified' }}</span></td>
                  <td class="px-4 py-3"><span :class="['text-xs px-2 py-1 rounded-full font-medium', u.privacyAccepted?(isDark?'bg-blue-900/50 text-blue-400':'bg-blue-100 text-blue-700'):(isDark?'bg-red-900/50 text-red-400':'bg-red-100 text-red-700')]">{{ u.privacyAccepted?'Accepted':'Pending' }}</span></td>
                  <td class="px-4 py-3"><span :class="['text-xs px-2 py-1 rounded-full font-medium capitalize', planBadgeClass(u.plan)]">{{ u.plan||'free' }}</span></td>
                  <td class="px-4 py-3" :class="thm.textMuted">{{ u.recordingCount }}</td>
                  <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtDate(u.createdAt) }}</td>
                  <td class="px-4 py-3" @click.stop>
                    <button @click="confirmDeleteUser(u)" :class="['text-xs px-2.5 py-1 rounded-lg transition', isDark?'bg-red-900/40 text-red-400 hover:bg-red-800/60':'bg-red-100 text-red-600 hover:bg-red-200']">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="userPages>1" :class="['flex items-center justify-between px-4 py-3', thm.borderT]">
            <button @click="userPage--;loadUsers()" :disabled="userPage<=1" :class="thm.btn">← Prev</button>
            <span class="text-xs" :class="thm.textFaint">Page {{ userPage }} / {{ userPages }}</span>
            <button @click="userPage++;loadUsers()" :disabled="userPage>=userPages" :class="thm.btn">Next →</button>
          </div>
        </div>
      </div>

      <!-- ── RECORDINGS ── -->
      <div v-if="activeTab === 'recordings'" class="space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <input v-model="recSearch" @input="debouncedRecSearch" type="text" placeholder="Search title…"
            :class="['w-full sm:w-72 px-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition', thm.input]"/>
          <span class="text-sm" :class="thm.textFaint">{{ recTotal }} recordings</span>
        </div>
        <div :class="[thm.card, 'overflow-hidden']">
          <div v-if="recsLoading" class="p-5 space-y-3">
            <div v-for="i in 5" :key="i" :class="['h-12 rounded-xl', thm.skeleton]"></div>
          </div>
          <div v-else-if="!recordings.length" class="px-5 py-10 text-center text-sm" :class="thm.textFaint">No recordings found.</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr :class="[thm.borderB, 'text-left']">
                <th v-for="h in ['Title','Owner','Duration','Status','Size','Created']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
              </tr></thead>
              <tbody :class="thm.divide">
                <tr v-for="r in recordings" :key="r._id" :class="['transition', thm.rowHover]">
                  <td class="px-4 py-3 font-medium max-w-[200px] truncate" :class="thm.text">{{ r.title }}</td>
                  <td class="px-4 py-3">
                    <div v-if="r.user"><p class="leading-none" :class="thm.textMuted">{{ r.user.name }}</p><p class="text-xs mt-0.5" :class="thm.textFaint">{{ r.user.email }}</p></div>
                    <span v-else :class="thm.textFaint">—</span>
                  </td>
                  <td class="px-4 py-3" :class="thm.textMuted">{{ fmtDuration(r.duration) }}</td>
                  <td class="px-4 py-3"><span :class="['text-xs px-2 py-1 rounded-full font-medium', statusClass(r.status)]">{{ r.status }}</span></td>
                  <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtBytes(r.audioSize) }}</td>
                  <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtDate(r.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="recPages>1" :class="['flex items-center justify-between px-4 py-3', thm.borderT]">
            <button @click="recPage--;loadRecordings()" :disabled="recPage<=1" :class="thm.btn">← Prev</button>
            <span class="text-xs" :class="thm.textFaint">Page {{ recPage }} / {{ recPages }}</span>
            <button @click="recPage++;loadRecordings()" :disabled="recPage>=recPages" :class="thm.btn">Next →</button>
          </div>
        </div>
      </div>

      <!-- ── ANALYTICS ── -->
      <div v-if="activeTab === 'analytics'" class="space-y-5">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm" :class="thm.textMuted">Period:</span>
          <button v-for="d in [7,14,30,60,90]" :key="d" @click="analyticsDays=d;loadAnalytics()"
            :class="['px-3 py-1 rounded-lg text-xs font-medium transition', analyticsDays===d?'bg-emerald-600 text-white':thm.btn]">{{ d }}d</button>
        </div>
        <div v-if="analyticsLoading" class="space-y-4">
          <div v-for="i in 5" :key="i" :class="['h-36 rounded-2xl', thm.skeleton]"></div>
        </div>
        <template v-else-if="analytics">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-1" :class="thm.textFaint">Total Audio</p>
              <p class="text-2xl font-bold" :class="thm.text">{{ fmtHours(analytics.totalDuration) }}<span class="text-sm font-normal ml-1" :class="thm.textFaint">hrs</span></p>
            </div>
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-1" :class="thm.textFaint">Storage Used</p>
              <p class="text-2xl font-bold" :class="thm.text">{{ fmtGB(analytics.totalSize) }}</p>
            </div>
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-1" :class="thm.textFaint">Privacy Consent</p>
              <p class="text-2xl font-bold" :class="thm.text">{{ analytics.privacyConsentRate }}<span class="text-sm font-normal ml-1" :class="thm.textFaint">%</span></p>
            </div>
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-1" :class="thm.textFaint">Google Sign-In</p>
              <p class="text-2xl font-bold" :class="thm.text">{{ analytics.authMethods.google }}<span class="text-sm font-normal ml-1" :class="thm.textFaint">users</span></p>
              <p class="text-xs mt-1" :class="thm.textFaint">vs {{ analytics.authMethods.email }} email</p>
            </div>
          </div>

          <div :class="[thm.card, 'p-5']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold" :class="thm.text">New Signups</h3>
              <span class="text-xs" :class="thm.textFaint">Last {{ analyticsDays }} days · {{ analytics.signupsPerDay.reduce((a,d)=>a+d.count,0) }} total</span>
            </div>
            <BarChart :data="analytics.signupsPerDay" color="#10b981" :dark="isDark"/>
          </div>

          <div :class="[thm.card, 'p-5']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold" :class="thm.text">Recordings Created</h3>
              <span class="text-xs" :class="thm.textFaint">Last {{ analyticsDays }} days · {{ analytics.recordingsPerDay.reduce((a,d)=>a+d.count,0) }} total</span>
            </div>
            <BarChart :data="analytics.recordingsPerDay" color="#3b82f6" :dark="isDark"/>
          </div>

          <div class="grid md:grid-cols-2 gap-5">
            <div :class="[thm.card, 'p-5']">
              <h3 class="font-semibold mb-4" :class="thm.text">Recording Status</h3>
              <div v-if="!analytics.statusBreakdown.length" class="text-sm" :class="thm.textFaint">No recordings.</div>
              <div v-else class="space-y-4">
                <div v-for="s in analytics.statusBreakdown" :key="s._id" class="space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="capitalize" :class="thm.textMuted">{{ s._id }}</span>
                    <span :class="thm.textFaint">{{ s.count }}</span>
                  </div>
                  <div :class="['h-2 rounded-full overflow-hidden', isDark?'bg-gray-800':'bg-gray-200']">
                    <div class="h-2 rounded-full" :class="statusBarColor(s._id)" :style="{width:Math.max(3,Math.round((s.count/analyticsMaxStatus)*100))+'%'}"></div>
                  </div>
                </div>
              </div>
            </div>
            <div :class="[thm.card, 'p-5']">
              <h3 class="font-semibold mb-4" :class="thm.text">Top Users by Recordings</h3>
              <div v-if="!analytics.topUsers.length" class="text-sm" :class="thm.textFaint">No data.</div>
              <ul v-else class="space-y-3">
                <li v-for="(u,i) in analytics.topUsers.slice(0,8)" :key="u.email||i" class="flex items-center gap-3">
                  <span class="w-5 shrink-0 text-xs text-right font-mono" :class="thm.textFaint">{{ i+1 }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm truncate leading-none" :class="thm.text">{{ u.name||'—' }}</p>
                    <p class="text-xs truncate mt-0.5" :class="thm.textFaint">{{ u.email }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-sm font-bold" :class="thm.text">{{ u.count }}</p>
                    <p class="text-xs" :class="thm.textFaint">{{ fmtDuration(u.totalDuration) }}</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div :class="[thm.card, 'p-5']">
            <h3 class="font-semibold mb-5" :class="thm.text">Auth Method Distribution</h3>
            <div class="flex items-center gap-10">
              <AuthDonut :google="analytics.authMethods.google" :email="analytics.authMethods.email"/>
              <div class="space-y-4">
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full bg-orange-500 shrink-0"></div>
                  <div>
                    <p class="text-sm font-medium" :class="thm.text">Google — {{ analytics.authMethods.google }}</p>
                    <p class="text-xs" :class="thm.textFaint">{{ authPct(analytics.authMethods.google, analytics) }}% of users</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
                  <div>
                    <p class="text-sm font-medium" :class="thm.text">Email — {{ analytics.authMethods.email }}</p>
                    <p class="text-xs" :class="thm.textFaint">{{ authPct(analytics.authMethods.email, analytics) }}% of users</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ── FINANCIALS ── -->
      <div v-if="activeTab === 'financials'" class="space-y-5">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm" :class="thm.textMuted">Period:</span>
          <button v-for="d in [7,14,30,60,90]" :key="d" @click="costsDays=d;loadCosts()"
            :class="['px-3 py-1 rounded-lg text-xs font-medium transition', costsDays===d?'bg-emerald-600 text-white':thm.btn]">{{ d }}d</button>
        </div>
        <div v-if="costsLoading" class="space-y-4">
          <div v-for="i in 6" :key="i" :class="['h-28 rounded-2xl', thm.skeleton]"></div>
        </div>
        <template v-else-if="costs">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-1" :class="thm.textFaint">Sarvam API</p>
              <p class="text-2xl font-bold text-emerald-400">{{ fmtUSD2(costs.allTime.sarvamCost) }}</p>
              <p class="text-xs mt-1" :class="thm.textFaint">{{ fmtMin(costs.allTime.sarvamMinutes) }} transcribed</p>
            </div>
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-1" :class="thm.textFaint">Gemini AI</p>
              <p class="text-2xl font-bold text-blue-400">{{ fmtUSD2(costs.allTime.geminiCost) }}</p>
              <p class="text-xs mt-1" :class="thm.textFaint">{{ fmtM(costs.allTime.geminiInputTokens) }} in · {{ fmtM(costs.allTime.geminiOutputTokens) }} out</p>
            </div>
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-1" :class="thm.textFaint">R2 Storage</p>
              <p class="text-2xl font-bold text-green-400">{{ fmtUSD2(costs.allTime.storageCostMonthly) }}<span class="text-sm font-normal ml-1" :class="thm.textFaint">/mo</span></p>
              <p class="text-xs mt-1" :class="thm.textFaint">{{ costs.allTime.storageGB.toFixed(2) }} GB</p>
            </div>
            <div :class="[thm.card, 'p-5 ring-1 ring-emerald-600/40']">
              <p class="text-xs mb-1" :class="thm.textFaint">Total Expenses</p>
              <p class="text-2xl font-bold" :class="thm.text">{{ fmtUSD2(costs.allTime.totalCost) }}</p>
              <p class="text-xs mt-1" :class="thm.textFaint">all-time API + storage</p>
            </div>
          </div>

          <div class="grid md:grid-cols-3 gap-4">
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-2 font-medium" :class="thm.textFaint">Sarvam Transcription</p>
              <div class="space-y-2">
                <div class="flex justify-between text-sm"><span :class="thm.textMuted">Minutes</span><span class="font-medium" :class="thm.text">{{ costs.allTime.sarvamMinutes.toFixed(1) }} min</span></div>
                <div class="flex justify-between text-sm"><span :class="thm.textMuted">Rate</span><span class="font-medium" :class="thm.text">${{ costs.pricing.SARVAM_COST_PER_MIN }}/min</span></div>
                <div :class="['flex justify-between text-sm pt-2 mt-2', thm.borderT]"><span class="font-medium" :class="thm.textMuted">Total</span><span class="font-bold text-emerald-400">{{ fmtUSD(costs.allTime.sarvamCost) }}</span></div>
              </div>
            </div>
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-2 font-medium" :class="thm.textFaint">Gemini 2.5 Flash</p>
              <div class="space-y-2">
                <div class="flex justify-between text-sm"><span :class="thm.textMuted">Input</span><span class="font-medium" :class="thm.text">{{ fmtM(costs.allTime.geminiInputTokens) }} tok</span></div>
                <div class="flex justify-between text-sm"><span :class="thm.textMuted">Output</span><span class="font-medium" :class="thm.text">{{ fmtM(costs.allTime.geminiOutputTokens) }} tok</span></div>
                <div :class="['flex justify-between text-sm pt-2 mt-2', thm.borderT]"><span class="font-medium" :class="thm.textMuted">Total</span><span class="font-bold text-blue-400">{{ fmtUSD(costs.allTime.geminiCost) }}</span></div>
              </div>
            </div>
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-2 font-medium" :class="thm.textFaint">Cloudflare R2</p>
              <div class="space-y-2">
                <div class="flex justify-between text-sm"><span :class="thm.textMuted">Stored</span><span class="font-medium" :class="thm.text">{{ costs.allTime.storageGB.toFixed(2) }} GB</span></div>
                <div class="flex justify-between text-sm"><span :class="thm.textMuted">Rate</span><span class="font-medium" :class="thm.text">${{ costs.pricing.R2_COST_PER_GB_MONTH }}/GB/mo</span></div>
                <div :class="['flex justify-between text-sm pt-2 mt-2', thm.borderT]"><span class="font-medium" :class="thm.textMuted">Monthly</span><span class="font-bold text-green-400">{{ fmtUSD(costs.allTime.storageCostMonthly) }}</span></div>
              </div>
            </div>
          </div>

          <div :class="[thm.card, 'p-5']">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold" :class="thm.text">Daily API Costs</h3>
              <div class="flex items-center gap-4 text-xs" :class="thm.textFaint">
                <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>Sarvam</span>
                <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span>Gemini</span>
              </div>
            </div>
            <CostBarChart :data="costs.costsPerDay" :dark="isDark"/>
          </div>

          <div :class="[thm.card, 'overflow-hidden']">
            <div :class="['px-5 py-4', thm.borderB]"><h3 class="font-semibold" :class="thm.text">Top Users by API Cost</h3></div>
            <div v-if="!costs.topUsers.length" class="px-5 py-10 text-center text-sm" :class="thm.textFaint">No data.</div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr :class="[thm.borderB,'text-left']">
                  <th v-for="h in ['#','User','Recordings','Minutes','Sarvam','Gemini','Total']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
                </tr></thead>
                <tbody :class="thm.divide">
                  <tr v-for="(u,i) in costs.topUsers" :key="u.email||i" :class="['transition', thm.rowHover]">
                    <td class="px-4 py-3 text-xs font-mono" :class="thm.textFaint">{{ i+1 }}</td>
                    <td class="px-4 py-3"><p class="font-medium leading-none" :class="thm.text">{{ u.name||'—' }}</p><p class="text-xs mt-0.5" :class="thm.textFaint">{{ u.email }}</p></td>
                    <td class="px-4 py-3" :class="thm.textMuted">{{ u.recordingCount }}</td>
                    <td class="px-4 py-3" :class="thm.textMuted">{{ u.totalMinutes.toFixed(1) }} min</td>
                    <td class="px-4 py-3 text-emerald-400 font-mono text-xs">{{ fmtUSD(u.sarvamCost) }}</td>
                    <td class="px-4 py-3 text-blue-400 font-mono text-xs">{{ fmtUSD(u.geminiCost) }}</td>
                    <td class="px-4 py-3 font-bold font-mono text-xs" :class="thm.text">{{ fmtUSD(u.totalCost) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div :class="[thm.card, 'p-5']">
            <p class="text-xs mb-3 font-medium uppercase tracking-wide" :class="thm.textFaint">Pricing Config</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div v-for="[label, val, unit] in [['Sarvam STT', costs.pricing.SARVAM_COST_PER_MIN, '/min'],['Gemini In', costs.pricing.GEMINI_INPUT_PER_1M, '/1M tok'],['Gemini Out', costs.pricing.GEMINI_OUTPUT_PER_1M, '/1M tok'],['R2 Storage', costs.pricing.R2_COST_PER_GB_MONTH, '/GB/mo']]" :key="label" :class="[thm.cardInner, 'px-4 py-3']">
                <p class="text-xs mb-1" :class="thm.textFaint">{{ label }}</p>
                <p class="font-mono text-sm" :class="thm.text">${{ val }}<span class="text-xs ml-1" :class="thm.textFaint">{{ unit }}</span></p>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ── SUBSCRIPTIONS ── -->
      <div v-if="activeTab === 'subscriptions'" class="space-y-5">
        <div v-if="subsLoading" class="space-y-4">
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div v-for="i in 5" :key="i" :class="['h-24 rounded-2xl', thm.skeleton]"></div>
          </div>
          <div v-for="i in 3" :key="i" :class="['h-40 rounded-2xl', thm.skeleton]"></div>
        </div>

        <template v-else-if="subscriptions">
          <!-- KPI row -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div :class="[thm.card, 'p-5 ring-1 ring-yellow-500/30']">
              <p class="text-xs mb-1" :class="thm.textFaint">MRR</p>
              <p class="text-2xl font-bold text-yellow-400">₹{{ subscriptions.stats.mrrInr.toLocaleString('en-IN') }}</p>
              <p class="text-xs mt-1" :class="thm.textFaint">monthly recurring revenue</p>
            </div>
            <div :class="[thm.card, 'p-5 ring-1 ring-emerald-500/30']">
              <p class="text-xs mb-1" :class="thm.textFaint">ARR</p>
              <p class="text-2xl font-bold text-emerald-400">₹{{ subscriptions.stats.arrInr.toLocaleString('en-IN') }}</p>
              <p class="text-xs mt-1" :class="thm.textFaint">annual run rate</p>
            </div>
            <div :class="[thm.card, 'p-5 ring-1 ring-blue-500/30']">
              <p class="text-xs mb-1" :class="thm.textFaint">ARPU</p>
              <p class="text-2xl font-bold text-blue-400">₹{{ subscriptions.stats.arpuInr.toLocaleString('en-IN') }}</p>
              <p class="text-xs mt-1" :class="thm.textFaint">avg revenue per user</p>
            </div>
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-1" :class="thm.textFaint">Churn Rate</p>
              <p class="text-2xl font-bold" :class="[subscriptions.stats.churnRate > 10 ? 'text-red-400' : 'text-white']">{{ subscriptions.stats.churnRate }}%</p>
              <p class="text-xs mt-1" :class="thm.textFaint">{{ subscriptions.stats.churnedUsers }} churned</p>
            </div>
          </div>
          <!-- Secondary KPIs -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-1" :class="thm.textFaint">Total Users</p>
              <p class="text-2xl font-bold" :class="thm.text">{{ subscriptions.stats.totalUsers }}</p>
              <p class="text-xs mt-1" :class="thm.textFaint">all accounts</p>
            </div>
            <div :class="[thm.card, 'p-5 ring-1 ring-emerald-500/20']">
              <p class="text-xs mb-1" :class="thm.textFaint">Active Pro</p>
              <p class="text-2xl font-bold text-emerald-400">{{ subscriptions.stats.activePro }}</p>
              <p class="text-xs mt-1" :class="thm.textFaint">subscribers</p>
            </div>
            <div :class="[thm.card, 'p-5 ring-1 ring-blue-500/20']">
              <p class="text-xs mb-1" :class="thm.textFaint">Active Team</p>
              <p class="text-2xl font-bold text-blue-400">{{ subscriptions.stats.activeTeam }}</p>
              <p class="text-xs mt-1" :class="thm.textFaint">subscribers</p>
            </div>
            <div :class="[thm.card, 'p-5']">
              <p class="text-xs mb-1" :class="thm.textFaint">Free Plan</p>
              <p class="text-2xl font-bold" :class="thm.text">{{ subscriptions.stats.freeUsers }}</p>
              <p class="text-xs mt-1 text-emerald-400">{{ subscriptions.stats.totalUsers > 0 ? Math.round(subscriptions.stats.activePaid/subscriptions.stats.totalUsers*100) : 0 }}% conversion</p>
            </div>
          </div>

          <!-- Plan distribution -->
          <div :class="[thm.card, 'p-5']">
            <h3 class="font-semibold mb-4" :class="thm.text">Plan Distribution</h3>
            <div class="flex flex-wrap items-center gap-4 mb-3 text-sm" :class="thm.textMuted">
              <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>Pro ({{ subscriptions.planBreakdown.pro }})</span>
              <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span>Team ({{ subscriptions.planBreakdown.team }})</span>
              <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-orange-400 inline-block"></span>Churned ({{ subscriptions.planBreakdown.expired }})</span>
              <span class="flex items-center gap-1.5"><span :class="['w-3 h-3 rounded-sm inline-block', isDark?'bg-gray-600':'bg-gray-400']"></span>Free ({{ subscriptions.planBreakdown.free }})</span>
            </div>
            <div :class="['w-full h-5 rounded-full overflow-hidden flex', isDark?'bg-gray-800':'bg-gray-200']">
              <div class="bg-emerald-500 h-full" :style="{width:planPct(subscriptions.planBreakdown.pro)+'%'}"></div>
              <div class="bg-blue-500 h-full" :style="{width:planPct(subscriptions.planBreakdown.team)+'%'}"></div>
              <div class="bg-orange-400 h-full" :style="{width:planPct(subscriptions.planBreakdown.expired)+'%'}"></div>
              <div :class="['h-full flex-1', isDark?'bg-gray-700':'bg-gray-300']"></div>
            </div>
            <div class="flex justify-between mt-2">
              <span class="text-xs" :class="thm.textFaint">
                Paid: {{ subscriptions.stats.activePaid }}
                ({{ subscriptions.stats.totalUsers > 0 ? Math.round(subscriptions.stats.activePaid/subscriptions.stats.totalUsers*100) : 0 }}% conversion)
              </span>
              <span class="text-xs text-orange-400">{{ subscriptions.stats.churnedUsers }} churned</span>
            </div>
          </div>

          <!-- Active Subscribers -->
          <div :class="[thm.card, 'overflow-hidden']">
            <div :class="['flex items-center justify-between px-5 py-4', thm.borderB]">
              <h3 class="font-semibold" :class="thm.text">Active Subscribers</h3>
              <span class="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">{{ subscriptions.subscribers.length }} active</span>
            </div>
            <div v-if="!subscriptions.subscribers.length" class="px-5 py-10 text-center text-sm" :class="thm.textFaint">No active paid subscribers yet.</div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr :class="[thm.borderB,'text-left']">
                  <th v-for="h in ['User','Plan','Billing','Started','Expires','Days Left','₹/mo']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
                </tr></thead>
                <tbody :class="thm.divide">
                  <tr v-for="u in subscriptions.subscribers" :key="u._id" :class="['transition', thm.rowHover]">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div :class="['w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0', thm.avatar]">{{ initials(u.name) }}</div>
                        <div><p class="font-medium leading-none" :class="thm.text">{{ u.name }}</p><p class="text-xs mt-0.5" :class="thm.textFaint">{{ u.email }}</p></div>
                      </div>
                    </td>
                    <td class="px-4 py-3"><span :class="['text-xs px-2 py-1 rounded-full font-medium capitalize', planBadgeClass(u.plan)]">{{ u.plan }}</span></td>
                    <td class="px-4 py-3 capitalize text-xs" :class="thm.textMuted">{{ u.planBillingCycle||'monthly' }}</td>
                    <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtDateShort(u.planStartDate) }}</td>
                    <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtDateShort(u.planExpiresAt) }}</td>
                    <td class="px-4 py-3">
                      <span :class="['text-xs font-mono font-bold', daysLeft(u.planExpiresAt)<=7?'text-orange-400':'text-emerald-400']">{{ daysLeft(u.planExpiresAt) }}d</span>
                    </td>
                    <td class="px-4 py-3 text-xs font-mono font-semibold" :class="thm.text">₹{{ subMonthlyValue(u) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Churned -->
          <div v-if="subscriptions.churned.length" :class="[thm.card, 'overflow-hidden']">
            <div :class="['flex items-center justify-between px-5 py-4', thm.borderB]">
              <h3 class="font-semibold" :class="thm.text">Recently Churned</h3>
              <span :class="['text-xs px-2 py-1 rounded-full', isDark?'bg-orange-900/40 text-orange-400':'bg-orange-100 text-orange-600']">{{ subscriptions.churned.length }} expired</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr :class="[thm.borderB,'text-left']">
                  <th v-for="h in ['User','Was On','Billing','Expired','Days Ago']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
                </tr></thead>
                <tbody :class="thm.divide">
                  <tr v-for="u in subscriptions.churned" :key="u._id" :class="['transition', thm.rowHover]">
                    <td class="px-4 py-3"><p class="font-medium leading-none" :class="thm.text">{{ u.name }}</p><p class="text-xs mt-0.5" :class="thm.textFaint">{{ u.email }}</p></td>
                    <td class="px-4 py-3"><span :class="['text-xs px-2 py-1 rounded-full capitalize', isDark?'bg-gray-800 text-gray-400':'bg-gray-100 text-gray-500']">{{ u.plan }}</span></td>
                    <td class="px-4 py-3 capitalize text-xs" :class="thm.textMuted">{{ u.planBillingCycle||'monthly' }}</td>
                    <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtDateShort(u.planExpiresAt) }}</td>
                    <td class="px-4 py-3 text-xs text-orange-400 font-mono">{{ Math.abs(daysLeft(u.planExpiresAt)) }}d ago</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Free users -->
          <div :class="[thm.card, 'overflow-hidden']">
            <div :class="['flex items-center justify-between px-5 py-4', thm.borderB]">
              <div>
                <h3 class="font-semibold" :class="thm.text">Free Plan Users</h3>
                <p class="text-xs mt-0.5" :class="thm.textFaint">Conversion opportunities · showing latest 50</p>
              </div>
              <span :class="['text-xs px-2 py-1 rounded-full', isDark?'bg-gray-800 text-gray-400':'bg-gray-100 text-gray-500']">{{ subscriptions.stats.freeUsers }} total</span>
            </div>
            <div v-if="!subscriptions.freeUsersList.length" class="px-5 py-10 text-center text-sm" :class="thm.textFaint">No free users.</div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr :class="[thm.borderB,'text-left']">
                  <th v-for="h in ['User','Verified','Joined']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
                </tr></thead>
                <tbody :class="thm.divide">
                  <tr v-for="u in subscriptions.freeUsersList" :key="u._id" :class="['transition', thm.rowHover]">
                    <td class="px-4 py-3"><p class="font-medium leading-none" :class="thm.text">{{ u.name }}</p><p class="text-xs mt-0.5" :class="thm.textFaint">{{ u.email }}</p></td>
                    <td class="px-4 py-3">
                      <span :class="['text-xs px-2 py-1 rounded-full font-medium', u.isVerified?(isDark?'bg-green-900/50 text-green-400':'bg-green-100 text-green-700'):(isDark?'bg-yellow-900/50 text-yellow-400':'bg-yellow-100 text-yellow-700')]">
                        {{ u.isVerified?'✓ Verified':'Unverified' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-xs" :class="thm.textFaint">{{ fmtDateShort(u.createdAt) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>

      <!-- ── COUPONS ── -->
      <div v-if="activeTab === 'coupons'" class="space-y-5">

        <!-- Create form -->
        <div :class="[thm.card, 'p-5']">
          <h2 class="font-semibold mb-4" :class="thm.text">Create Coupon</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label class="text-xs mb-1 block" :class="thm.textFaint">Code *</label>
              <input v-model="couponForm.code" placeholder="LAUNCH20" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" />
            </div>
            <div>
              <label class="text-xs mb-1 block" :class="thm.textFaint">Type *</label>
              <select v-model="couponForm.discountType" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]">
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat (₹ paise)</option>
              </select>
            </div>
            <div>
              <label class="text-xs mb-1 block" :class="thm.textFaint">Value * {{ couponForm.discountType === 'percent' ? '(%)' : '(paise)' }}</label>
              <input v-model="couponForm.discountValue" type="number" placeholder="20" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" />
            </div>
            <div>
              <label class="text-xs mb-1 block" :class="thm.textFaint">Plans (comma-separated, empty=all)</label>
              <input v-model="couponForm.applicablePlans" placeholder="pro_monthly,pro_annual" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" />
            </div>
            <div>
              <label class="text-xs mb-1 block" :class="thm.textFaint">Max Uses (empty=unlimited)</label>
              <input v-model="couponForm.maxUses" type="number" placeholder="100" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" />
            </div>
            <div>
              <label class="text-xs mb-1 block" :class="thm.textFaint">Expires At (empty=never)</label>
              <input v-model="couponForm.expiresAt" type="date" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" />
            </div>
          </div>
          <div v-if="couponFormError" class="text-red-400 text-xs mb-3">{{ couponFormError }}</div>
          <button @click="createCoupon" :disabled="couponSaving" class="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition disabled:opacity-50">
            {{ couponSaving ? 'Creating…' : 'Create Coupon' }}
          </button>
        </div>

        <!-- Coupons list -->
        <div :class="[thm.card, 'overflow-hidden']">
          <div :class="['px-5 py-4 flex items-center justify-between', thm.borderB]">
            <h2 class="font-semibold" :class="thm.text">All Coupons</h2>
            <span class="text-xs" :class="thm.textFaint">{{ coupons.length }} total</span>
          </div>
          <div v-if="couponsLoading" class="p-6 text-center text-sm" :class="thm.textFaint">Loading…</div>
          <div v-else-if="!coupons.length" class="p-6 text-center text-sm" :class="thm.textFaint">No coupons yet.</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr :class="[thm.borderB, 'text-left']">
                <th v-for="h in ['Code','Type','Value','Plans','Uses','Expires','Status','']" :key="h" class="px-4 py-3 text-xs font-medium" :class="thm.textFaint">{{ h }}</th>
              </tr></thead>
              <tbody :class="thm.divide">
                <tr v-for="c in coupons" :key="c._id" :class="['transition', thm.rowHover]">
                  <td class="px-4 py-3 font-mono font-bold" :class="thm.text">{{ c.code }}</td>
                  <td class="px-4 py-3" :class="thm.textMuted">{{ c.discountType }}</td>
                  <td class="px-4 py-3 font-semibold text-emerald-400">{{ c.discountType === 'percent' ? c.discountValue + '%' : '₹' + (c.discountValue / 100) }}</td>
                  <td class="px-4 py-3 text-xs" :class="thm.textMuted">{{ c.applicablePlans.length ? c.applicablePlans.join(', ') : 'All' }}</td>
                  <td class="px-4 py-3" :class="thm.textMuted">{{ c.usedCount }}<span class="text-xs ml-0.5">{{ c.maxUses !== null ? '/' + c.maxUses : '' }}</span></td>
                  <td class="px-4 py-3 text-xs" :class="thm.textMuted">{{ c.expiresAt ? fmtDateShort(c.expiresAt) : '—' }}</td>
                  <td class="px-4 py-3">
                    <span :class="['text-xs px-2 py-0.5 rounded-full font-medium', c.isActive ? (isDark?'bg-green-900/50 text-green-400':'bg-green-100 text-green-700') : (isDark?'bg-gray-800 text-gray-400':'bg-gray-100 text-gray-500')]">
                      {{ c.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <button @click="toggleCoupon(c)" :class="thm.btn">{{ c.isActive ? 'Disable' : 'Enable' }}</button>
                      <button @click="deleteCoupon(c)" class="px-3 py-1.5 text-xs rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition">Delete</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- ── PLANS ── -->
      <div v-if="activeTab === 'plans'" class="space-y-6">
        <div :class="[thm.card, 'p-5']">
          <h2 class="font-semibold mb-1" :class="thm.text">Plan Feature Editor</h2>
          <p class="text-xs mb-5" :class="thm.textFaint">Toggle features on/off, edit text, add or remove rows. Changes are saved per plan.</p>

          <!-- Plan selector -->
          <div class="flex gap-2 flex-wrap mb-6">
            <button v-for="p in planKeys" :key="p"
              @click="activePlanEdit = p"
              :class="['px-4 py-2 rounded-xl text-sm font-semibold transition', activePlanEdit === p ? 'bg-emerald-600 text-white' : thm.btn]">
              {{ p.charAt(0).toUpperCase() + p.slice(1) }}
            </button>
          </div>

          <!-- Prices -->
          <div class="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label class="text-xs font-semibold mb-1 block" :class="thm.textFaint">Monthly Price <span class="font-normal">(e.g. ₹499)</span></label>
              <input v-model="editingMonthlyPrice" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" placeholder="₹499" />
            </div>
            <div>
              <label class="text-xs font-semibold mb-1 block" :class="thm.textFaint">Annual/mo <span class="font-normal">(e.g. ₹399)</span></label>
              <input v-model="editingAnnualMonthly" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" placeholder="₹399" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label class="text-xs font-semibold mb-1 block" :class="thm.textFaint">Annual Total <span class="font-normal">(e.g. ₹4,788)</span></label>
              <input v-model="editingAnnualTotal" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" placeholder="₹4,788" />
            </div>
            <div>
              <label class="text-xs font-semibold mb-1 block" :class="thm.textFaint">Monthly Paise <span class="font-normal">(for MRR)</span></label>
              <input v-model.number="editingMonthlyPaise" type="number" :class="['w-full text-sm px-3 py-2 rounded-lg border', thm.input]" placeholder="49900" />
            </div>
          </div>

          <!-- Feature rows -->
          <div v-if="plansLoading" class="text-sm py-6 text-center" :class="thm.textFaint">Loading…</div>
          <div v-else class="space-y-2">
            <div v-for="(feat, idx) in editingFeatures" :key="idx"
              :class="['flex items-center gap-3 px-3 py-2.5 rounded-xl border', isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50']">
              <!-- tick/cross toggle -->
              <button @click="feat.included = !feat.included"
                :class="['w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition',
                  feat.included ? 'bg-emerald-600 text-white' : (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-400')]">
                <svg v-if="feat.included" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <!-- text input -->
              <input v-model="feat.text" :class="['flex-1 bg-transparent text-sm outline-none', thm.text]" placeholder="Feature text" />
              <!-- delete -->
              <button @click="editingFeatures.splice(idx, 1)"
                class="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>

            <!-- Add row -->
            <button @click="editingFeatures.push({ text: '', included: true })"
              :class="['w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition flex items-center justify-center gap-2',
                isDark ? 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400' : 'border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600']">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add Feature
            </button>
          </div>

          <!-- Feature Gates -->
          <div :class="['mt-5 p-4 rounded-xl border', isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50']">
            <p class="text-xs font-bold mb-3 uppercase tracking-wide" :class="thm.textFaint">Feature Gates <span class="font-normal normal-case">(overrides plan defaults — leave off to use defaults)</span></p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label v-for="gate in gateKeys" :key="gate.key"
                :class="['flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition',
                  isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100 border border-gray-200']">
                <div>
                  <span class="text-sm font-medium" :class="thm.text">{{ gate.label }}</span>
                  <span class="text-xs block mt-0.5" :class="thm.textFaint">default: {{ defaultGates[activePlanEdit]?.[gate.key] ? 'ON' : 'OFF' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs" :class="thm.textFaint">{{ editingGates[gate.key] === null ? 'Default' : editingGates[gate.key] ? 'ON' : 'OFF' }}</span>
                  <button @click="cycleGate(gate.key)"
                    :class="['w-10 h-6 rounded-full transition-all relative flex-shrink-0',
                      editingGates[gate.key] === null ? (isDark ? 'bg-gray-600' : 'bg-gray-300') :
                      editingGates[gate.key] ? 'bg-emerald-500' : 'bg-red-400']">
                    <span :class="['absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
                      editingGates[gate.key] === null ? 'left-0.5' :
                      editingGates[gate.key] ? 'left-[18px]' : 'left-0.5']"></span>
                  </button>
                </div>
              </label>
            </div>
          </div>

          <!-- Save -->
          <div class="flex items-center gap-3 mt-5">
            <button @click="savePlanFeatures" :disabled="plansSaving"
              class="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition disabled:opacity-50">
              {{ plansSaving ? 'Saving…' : 'Save Changes' }}
            </button>
            <span v-if="plansSaveMsg" :class="['text-xs font-medium', plansSaveMsg.ok ? 'text-emerald-400' : 'text-red-400']">{{ plansSaveMsg.text }}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- User detail drawer -->
    <transition name="drawer">
      <div v-if="selectedUser" class="fixed inset-0 z-50 flex justify-end" @click.self="selectedUser=null">
        <div :class="['w-full max-w-md h-full overflow-y-auto shadow-2xl', thm.drawer]">
          <div :class="['flex items-center justify-between px-5 py-4 sticky top-0 z-10', thm.borderB, isDark?'bg-gray-900':'bg-white']">
            <h3 class="font-semibold" :class="thm.text">User Detail</h3>
            <button @click="selectedUser=null" class="text-xl leading-none" :class="thm.textMuted">×</button>
          </div>
          <div class="p-5 space-y-5">
            <div class="flex items-center gap-4">
              <div :class="['w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold', thm.avatar]">{{ initials(selectedUser.user.name) }}</div>
              <div>
                <p class="font-bold text-lg leading-none" :class="thm.text">{{ selectedUser.user.name }}</p>
                <p class="text-sm mt-1" :class="thm.textMuted">{{ selectedUser.user.email }}</p>
                <div class="flex gap-2 mt-2 flex-wrap">
                  <span :class="['text-xs px-2 py-0.5 rounded-full', selectedUser.user.isVerified?(isDark?'bg-green-900/50 text-green-400':'bg-green-100 text-green-700'):(isDark?'bg-yellow-900/50 text-yellow-400':'bg-yellow-100 text-yellow-700')]">{{ selectedUser.user.isVerified?'Verified':'Unverified' }}</span>
                  <span :class="['text-xs px-2 py-0.5 rounded-full', selectedUser.user.privacyAccepted?(isDark?'bg-blue-900/50 text-blue-400':'bg-blue-100 text-blue-700'):(isDark?'bg-red-900/50 text-red-400':'bg-red-100 text-red-700')]">{{ selectedUser.user.privacyAccepted?'Privacy ✓':'No consent' }}</span>
                  <span v-if="selectedUser.user.googleId" :class="['text-xs px-2 py-0.5 rounded-full', isDark?'bg-orange-900/50 text-orange-400':'bg-orange-100 text-orange-700']">Google</span>
                  <span :class="['text-xs px-2 py-0.5 rounded-full capitalize', planBadgeClass(selectedUser.user.plan)]">{{ selectedUser.user.plan||'free' }}</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <DetailRow :dark="isDark" label="Joined" :value="fmtDate(selectedUser.user.createdAt)"/>
              <DetailRow :dark="isDark" label="Role" :value="selectedUser.user.role||'user'"/>
              <DetailRow :dark="isDark" label="Plan" :value="selectedUser.user.plan||'free'"/>
              <DetailRow :dark="isDark" label="Expires" :value="selectedUser.user.planExpiresAt?fmtDateShort(selectedUser.user.planExpiresAt):'—'"/>
              <DetailRow :dark="isDark" label="Privacy Date" :value="selectedUser.user.privacyAcceptedAt?fmtDateShort(selectedUser.user.privacyAcceptedAt):'—'"/>
              <DetailRow :dark="isDark" label="Recordings" :value="String(selectedUser.recordings.length)"/>
            </div>

            <div>
              <h4 class="text-sm font-semibold mb-3" :class="thm.textMuted">Recordings (last 20)</h4>
              <div v-if="!selectedUser.recordings.length" class="text-sm" :class="thm.textFaint">No recordings.</div>
              <ul v-else class="space-y-2">
                <li v-for="r in selectedUser.recordings" :key="r._id" :class="[thm.cardInner, 'px-4 py-3 flex items-center gap-3']">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm truncate" :class="thm.text">{{ r.title }}</p>
                    <p class="text-xs mt-0.5" :class="thm.textFaint">{{ fmtDuration(r.duration) }} · {{ fmtDate(r.createdAt) }}</p>
                  </div>
                  <span :class="['text-xs px-2 py-0.5 rounded-full', statusClass(r.status)]">{{ r.status }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Delete modal -->
    <div v-if="deleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" @click.self="deleteConfirm=null">
      <div :class="[thm.modal, 'rounded-2xl p-6 w-full max-w-sm shadow-2xl']">
        <h3 class="font-bold text-lg mb-2" :class="thm.text">Delete User?</h3>
        <p class="text-sm mb-5" :class="thm.textMuted">Permanently deletes <strong :class="thm.text">{{ deleteConfirm.name }}</strong> and all their recordings.</p>
        <div class="flex gap-3">
          <button @click="deleteConfirm=null" :class="['flex-1 py-2.5 rounded-xl text-sm font-medium transition', isDark?'bg-gray-800 text-gray-300 hover:bg-gray-700':'bg-gray-100 text-gray-700 hover:bg-gray-200']">Cancel</button>
          <button @click="executeDeleteUser" :disabled="deleteLoading" class="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition disabled:opacity-50">{{ deleteLoading?'Deleting…':'Delete' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h } from 'vue';
import { adminApi, couponsApi, plansApi, authState } from '@/api';

const adminEmail = computed(() => authState.user?.email || '');
const globalError = ref('');
const isDark = ref(true);

const thm = computed(() => {
  const d = isDark.value;
  return {
    root:      d ? 'min-h-screen bg-gray-950 text-gray-100' : 'min-h-screen bg-gray-50 text-gray-900',
    header:    d ? 'sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center justify-between'
                 : 'sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4 flex items-center justify-between',
    card:      d ? 'bg-gray-900 border border-gray-800 rounded-2xl' : 'bg-white border border-gray-200 rounded-2xl shadow-sm',
    cardInner: d ? 'bg-gray-800 rounded-xl' : 'bg-gray-100 rounded-xl',
    tabBar:    d ? 'bg-gray-900' : 'bg-gray-100',
    tabActive: 'px-4 py-2 rounded-lg text-sm font-medium transition bg-emerald-600 text-white shadow',
    tabInactive: d ? 'px-4 py-2 rounded-lg text-sm font-medium transition text-gray-400 hover:text-white hover:bg-gray-800'
                   : 'px-4 py-2 rounded-lg text-sm font-medium transition text-gray-500 hover:text-gray-900 hover:bg-gray-200',
    text:      d ? 'text-white'   : 'text-gray-900',
    textMuted: d ? 'text-gray-400' : 'text-gray-600',
    textFaint: d ? 'text-gray-500' : 'text-gray-400',
    input:     d ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                 : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
    divide:    d ? 'divide-y divide-gray-800' : 'divide-y divide-gray-200',
    borderT:   d ? 'border-t border-gray-800' : 'border-t border-gray-200',
    borderB:   d ? 'border-b border-gray-800' : 'border-b border-gray-200',
    rowHover:  d ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50',
    btn:       d ? 'px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition'
                 : 'px-3 py-1.5 text-xs rounded-lg bg-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-300 transition',
    btnNav:    d ? 'px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition'
                 : 'px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition',
    avatar:    d ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
    skeleton:  d ? 'animate-pulse bg-gray-800' : 'animate-pulse bg-gray-200',
    modal:     d ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200',
    drawer:    d ? 'bg-gray-900 border-l border-gray-800' : 'bg-white border-l border-gray-200',
    accent:    d ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-500',
  };
});

// ── Inline sub-components ─────────────────────────────────────────────────────
const StatCard = defineComponent({
  props: ['label', 'value', 'color', 'dark'],
  setup(props) {
    return () => {
      const d = props.dark !== false;
      const cardCls  = d ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm';
      const textCls  = d ? 'text-white'   : 'text-gray-900';
      const mutedCls = d ? 'text-gray-500' : 'text-gray-400';
      const colorMap = {
        emerald: d ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
        green:   d ? 'bg-green-900/50 text-green-300'     : 'bg-green-50 text-green-700',
        blue:    d ? 'bg-blue-900/50 text-blue-300'       : 'bg-blue-50 text-blue-700',
        yellow:  d ? 'bg-yellow-900/50 text-yellow-300'   : 'bg-yellow-50 text-yellow-700',
      };
      const iconCls = colorMap[props.color] || colorMap.emerald;
      return h('div', { class: `${cardCls} rounded-2xl p-5 flex items-center gap-4` }, [
        h('div', { class: `w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconCls}` },
          h('span', { class: 'text-sm font-bold' }, props.value ?? '—')
        ),
        h('div', {}, [
          h('p', { class: `text-2xl font-bold ${textCls} leading-none` }, props.value ?? '—'),
          h('p', { class: `text-xs ${mutedCls} mt-1` }, props.label),
        ]),
      ]);
    };
  },
});

const DetailRow = defineComponent({
  props: ['label', 'value', 'dark'],
  setup(props) {
    return () => {
      const d = props.dark !== false;
      return h('div', { class: `${d?'bg-gray-800':'bg-gray-100'} rounded-xl px-4 py-3` }, [
        h('p', { class: `text-xs ${d?'text-gray-500':'text-gray-400'} mb-1` }, props.label),
        h('p', { class: `text-sm ${d?'text-white':'text-gray-900'} font-medium` }, props.value || '—'),
      ]);
    };
  },
});

const BarChart = defineComponent({
  props: ['data', 'color', 'dark'],
  setup(props) {
    return () => {
      const data = props.data || [];
      if (!data.length) return h('div', { class: 'text-gray-500 text-sm py-4' }, 'No data');
      const W = 600, H = 80, gap = 1;
      const max = Math.max(...data.map(d => d.count), 1);
      const barW = Math.floor((W - 20) / data.length) - gap;
      const labelEvery = Math.ceil(data.length / 7);
      const ax = props.dark !== false ? '#6b7280' : '#9ca3af';
      const nodes = [];
      data.forEach((d, i) => {
        const bH = Math.max(2, Math.round((d.count / max) * H));
        const x = 10 + i * (barW + gap);
        nodes.push(h('rect', { key: `b${i}`, x, y: H - bH, width: barW, height: bH, fill: props.color, rx: 2, opacity: 0.85 }));
        if (i % labelEvery === 0) nodes.push(h('text', { key: `l${i}`, x: x + barW/2, y: H + 16, 'text-anchor': 'middle', 'font-size': 9, fill: ax }, d.date.slice(5)));
        if (d.count > 0) nodes.push(h('title', { key: `t${i}` }, `${d.date}: ${d.count}`));
      });
      nodes.push(h('text', { key: 'ymax', x: 4, y: 8, 'font-size': 9, fill: ax }, String(max)));
      return h('div', { class: 'overflow-x-auto' },
        h('svg', { viewBox: `0 0 ${W} ${H + 24}`, class: 'w-full', style: 'min-width:300px' }, nodes)
      );
    };
  },
});

const AuthDonut = defineComponent({
  props: ['google', 'email'],
  setup(props) {
    return () => {
      const total = (props.google || 0) + (props.email || 0);
      if (!total) return h('div', { class: 'text-gray-500 text-sm' }, 'No data');
      const r = 36, cx = 50, cy = 50, circ = 2 * Math.PI * r;
      const googleArc = (props.google / total) * circ;
      return h('svg', { viewBox: '0 0 100 100', class: 'w-24 h-24 shrink-0', style: 'transform:rotate(-90deg)' }, [
        h('circle', { cx, cy, r, fill: 'none', stroke: '#10b981', 'stroke-width': 14, 'stroke-dasharray': `${circ} 0` }),
        h('circle', { cx, cy, r, fill: 'none', stroke: '#f97316', 'stroke-width': 14, 'stroke-dasharray': `${googleArc} ${circ - googleArc}` }),
      ]);
    };
  },
});

const CostBarChart = defineComponent({
  props: ['data', 'dark'],
  setup(props) {
    return () => {
      const data = props.data || [];
      if (!data.length) return h('div', { class: 'text-gray-500 text-sm py-4' }, 'No data');
      const W = 600, H = 80, gap = 1;
      const maxVal = Math.max(...data.map(d => d.total), 0.0001);
      const barW = Math.max(2, Math.floor((W - 20) / data.length) - gap);
      const labelEvery = Math.ceil(data.length / 7);
      const ax = props.dark !== false ? '#6b7280' : '#9ca3af';
      const nodes = [];
      data.forEach((d, i) => {
        const x = 10 + i * (barW + gap);
        const sH = Math.max(0, Math.round((d.sarvam / maxVal) * H));
        const gH = Math.max(0, Math.round((d.gemini / maxVal) * H));
        const stackH = Math.min(H, sH + gH);
        if (stackH > 0) {
          nodes.push(h('rect', { key: `g${i}`, x, y: H - stackH, width: barW, height: gH || stackH, fill: '#3b82f6', rx: 2, opacity: 0.85 }));
          if (sH > 0) nodes.push(h('rect', { key: `s${i}`, x, y: H - stackH + gH, width: barW, height: sH, fill: '#10b981', opacity: 0.85 }));
        }
        if (i % labelEvery === 0) nodes.push(h('text', { key: `l${i}`, x: x + barW/2, y: H + 16, 'text-anchor': 'middle', 'font-size': 9, fill: ax }, d.date.slice(5)));
        if (d.total > 0) nodes.push(h('title', { key: `t${i}` }, `${d.date}: $${d.total.toFixed(5)}`));
      });
      nodes.push(h('text', { key: 'ymax', x: 4, y: 8, 'font-size': 9, fill: ax }, '$' + maxVal.toFixed(4)));
      return h('div', { class: 'overflow-x-auto' },
        h('svg', { viewBox: `0 0 ${W} ${H + 24}`, class: 'w-full', style: 'min-width:300px' }, nodes)
      );
    };
  },
});

// ── Tabs ──────────────────────────────────────────────────────────────────────
const tabs = [
  { id: 'overview',      label: 'Overview' },
  { id: 'users',         label: 'Users' },
  { id: 'recordings',    label: 'Recordings' },
  { id: 'analytics',     label: 'Analytics' },
  { id: 'financials',    label: 'Financials' },
  { id: 'subscriptions', label: 'Revenue' },
  { id: 'coupons',       label: 'Coupons' },
  { id: 'plans',         label: 'Plans' },
];
const activeTab = ref('overview');

// ── Stats ─────────────────────────────────────────────────────────────────────
const stats = ref(null);
const statsLoading = ref(false);
async function loadStats() {
  statsLoading.value = true;
  try { stats.value = await adminApi.getStats(); }
  catch (e) { globalError.value = e.message || 'Failed to load stats'; }
  finally { statsLoading.value = false; }
}

// ── Activity ──────────────────────────────────────────────────────────────────
const activity = ref([]);
const activityLoading = ref(false);
async function loadActivity() {
  activityLoading.value = true;
  try { const d = await adminApi.getActivity(40); activity.value = d.events; }
  catch (e) { globalError.value = e.message || 'Failed to load activity'; }
  finally { activityLoading.value = false; }
}

// ── Users ─────────────────────────────────────────────────────────────────────
const users = ref([]);
const usersLoading = ref(false);
const userSearch = ref('');
const userPage = ref(1);
const userTotal = ref(0);
const userPages = ref(1);
let userSearchTimer = null;

async function loadUsers() {
  usersLoading.value = true;
  try {
    const d = await adminApi.getUsers(userPage.value, userSearch.value);
    users.value = d.users; userTotal.value = d.total; userPages.value = d.pages;
  } catch (e) { globalError.value = e.message || 'Failed to load users'; }
  finally { usersLoading.value = false; }
}

function debouncedUserSearch() {
  userPage.value = 1;
  clearTimeout(userSearchTimer);
  userSearchTimer = setTimeout(loadUsers, 350);
}

const selectedUser = ref(null);
async function openUser(u) {
  selectedUser.value = { user: u, recordings: [] };
  try { selectedUser.value = await adminApi.getUser(u._id); } catch {}
}

const deleteConfirm = ref(null);
const deleteLoading = ref(false);
function confirmDeleteUser(u) { deleteConfirm.value = u; }
async function executeDeleteUser() {
  if (!deleteConfirm.value) return;
  deleteLoading.value = true;
  try {
    await adminApi.deleteUser(deleteConfirm.value._id);
    users.value = users.value.filter(u => u._id !== deleteConfirm.value._id);
    userTotal.value--;
    if (selectedUser.value?.user?._id === deleteConfirm.value._id) selectedUser.value = null;
    deleteConfirm.value = null;
  } catch (e) { globalError.value = e.message || 'Failed to delete user'; }
  finally { deleteLoading.value = false; }
}

// ── Recordings ────────────────────────────────────────────────────────────────
const recordings = ref([]);
const recsLoading = ref(false);
const recSearch = ref('');
const recPage = ref(1);
const recTotal = ref(0);
const recPages = ref(1);
let recSearchTimer = null;

async function loadRecordings() {
  recsLoading.value = true;
  try {
    const d = await adminApi.getRecordings(recPage.value, recSearch.value);
    recordings.value = d.recordings; recTotal.value = d.total; recPages.value = d.pages;
  } catch (e) { globalError.value = e.message || 'Failed to load recordings'; }
  finally { recsLoading.value = false; }
}

function debouncedRecSearch() {
  recPage.value = 1;
  clearTimeout(recSearchTimer);
  recSearchTimer = setTimeout(loadRecordings, 350);
}

// ── Analytics ─────────────────────────────────────────────────────────────────
const analytics = ref(null);
const analyticsLoading = ref(false);
const analyticsDays = ref(30);
const analyticsMaxStatus = computed(() =>
  !analytics.value?.statusBreakdown?.length ? 1 : Math.max(...analytics.value.statusBreakdown.map(s => s.count), 1)
);

async function loadAnalytics() {
  analyticsLoading.value = true;
  try { analytics.value = await adminApi.getAnalytics(analyticsDays.value); }
  catch (e) { globalError.value = e.message || 'Failed to load analytics'; }
  finally { analyticsLoading.value = false; }
}

// ── Financials ────────────────────────────────────────────────────────────────
const costs = ref(null);
const costsLoading = ref(false);
const costsDays = ref(30);

async function loadCosts() {
  costsLoading.value = true;
  try { costs.value = await adminApi.getCosts(costsDays.value); }
  catch (e) { globalError.value = e.message || 'Failed to load financials'; }
  finally { costsLoading.value = false; }
}

// ── Subscriptions ─────────────────────────────────────────────────────────────
const subscriptions = ref(null);
const subsLoading = ref(false);

async function loadSubscriptions() {
  subsLoading.value = true;
  try { subscriptions.value = await adminApi.getSubscriptions(); }
  catch (e) { globalError.value = e.message || 'Failed to load subscriptions'; }
  finally { subsLoading.value = false; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDuration(sec) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtHours(sec) { return ((sec || 0) / 3600).toFixed(1); }

function fmtGB(bytes) {
  if (!bytes) return '0.00';
  if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(0) + ' MB';
  return (bytes / 1024 ** 3).toFixed(2) + ' GB';
}

function fmtUSD(n) { return '$' + (n || 0).toFixed(4); }
function fmtUSD2(n) { return '$' + (n || 0).toFixed(2); }

function fmtM(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

function fmtMin(m) {
  if (!m) return '0 min';
  if (m >= 60) return (m / 60).toFixed(1) + ' hr';
  return m.toFixed(1) + ' min';
}

function daysLeft(d) {
  if (!d) return 0;
  return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
}

function planPct(count) {
  const total = subscriptions.value?.stats?.totalUsers || 1;
  return Math.round((count / total) * 100);
}

function subMonthlyValue(u) {
  const PRICES = { pro_monthly: 749, pro_annual: 625, team_monthly: 1999, team_annual: 1667 };
  return (PRICES[`${u.plan}_${u.planBillingCycle || 'monthly'}`] || 0).toLocaleString('en-IN');
}

function planBadgeClass(plan) {
  const d = isDark.value;
  if (plan === 'pro')  return d ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700';
  if (plan === 'team') return d ? 'bg-blue-900/50 text-blue-400'       : 'bg-blue-100 text-blue-700';
  return d ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500';
}

function statusClass(s) {
  const d = isDark.value;
  if (!s) return d ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500';
  if (s === 'completed' || s === 'summarized') return d ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700';
  if (s === 'transcribed') return d ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700';
  if (s === 'failed')      return d ? 'bg-red-900/50 text-red-400'   : 'bg-red-100 text-red-700';
  if (s === 'pending')     return d ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700';
  return d ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500';
}

function statusBarColor(s) {
  if (s === 'completed' || s === 'summarized') return 'bg-green-500';
  if (s === 'transcribed') return 'bg-blue-500';
  if (s === 'failed')      return 'bg-red-500';
  if (s === 'pending')     return 'bg-yellow-500';
  return 'bg-emerald-500';
}

function authPct(val, a) {
  const total = a.authMethods.google + a.authMethods.email;
  return total > 0 ? Math.round((val / total) * 100) : 0;
}

// ── Coupons ───────────────────────────────────────────────────────────────────
const coupons = ref([]);
const couponsLoading = ref(false);
const couponForm = ref({ code: '', discountType: 'percent', discountValue: '', applicablePlans: '', maxUses: '', expiresAt: '' });
const couponFormError = ref('');
const couponSaving = ref(false);

async function loadCoupons() {
  couponsLoading.value = true;
  try { const d = await couponsApi.getAll(); coupons.value = d.coupons; }
  catch (e) { globalError.value = e.message || 'Failed to load coupons'; }
  finally { couponsLoading.value = false; }
}

async function createCoupon() {
  couponFormError.value = '';
  const f = couponForm.value;
  if (!f.code || !f.discountValue) { couponFormError.value = 'Code and discount value are required.'; return; }
  couponSaving.value = true;
  try {
    await couponsApi.create({
      code: f.code,
      discountType: f.discountType,
      discountValue: Number(f.discountValue),
      applicablePlans: f.applicablePlans ? f.applicablePlans.split(',').map(s => s.trim()).filter(Boolean) : [],
      maxUses: f.maxUses ? Number(f.maxUses) : null,
      expiresAt: f.expiresAt || null,
    });
    couponForm.value = { code: '', discountType: 'percent', discountValue: '', applicablePlans: '', maxUses: '', expiresAt: '' };
    await loadCoupons();
  } catch (e) { couponFormError.value = e.message || 'Failed to create coupon'; }
  finally { couponSaving.value = false; }
}

async function toggleCoupon(c) {
  try { await couponsApi.update(c._id, { isActive: !c.isActive }); await loadCoupons(); }
  catch (e) { globalError.value = e.message || 'Failed to update coupon'; }
}

async function deleteCoupon(c) {
  if (!confirm(`Delete coupon "${c.code}"?`)) return;
  try { await couponsApi.remove(c._id); await loadCoupons(); }
  catch (e) { globalError.value = e.message || 'Failed to delete coupon'; }
}

// ── Init ──────────────────────────────────────────────────────────────────────
// ── Plans ─────────────────────────────────────────────────────────────────────
const planKeys = ['free', 'starter', 'pro', 'growth', 'team'];
const activePlanEdit = ref('free');
const allPlanData = ref({});
const plansLoading = ref(false);
const plansSaving = ref(false);
const plansSaveMsg = ref(null);

const editingFeatures = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.features ?? [],
  set: (val) => {
    if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {};
    allPlanData.value[activePlanEdit.value].features = val;
  },
});
const editingMonthlyPrice = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.monthlyPrice ?? '',
  set: (val) => { if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {}; allPlanData.value[activePlanEdit.value].monthlyPrice = val; },
});
const editingAnnualMonthly = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.annualMonthly ?? '',
  set: (val) => { if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {}; allPlanData.value[activePlanEdit.value].annualMonthly = val; },
});
const editingAnnualTotal = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.annualTotal ?? '',
  set: (val) => { if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {}; allPlanData.value[activePlanEdit.value].annualTotal = val; },
});
const editingMonthlyPaise = computed({
  get: () => allPlanData.value[activePlanEdit.value]?.monthlyPaise ?? 0,
  set: (val) => { if (!allPlanData.value[activePlanEdit.value]) allPlanData.value[activePlanEdit.value] = {}; allPlanData.value[activePlanEdit.value].monthlyPaise = val; },
});

// ── Feature Gates ─────────────────────────────────────────────────────────────
const PLAN_DEFAULTS = {
  free:    { meetingMinutes: false, actionItems: false, pdfExport: false, indianLanguages: true  },
  starter: { meetingMinutes: false, actionItems: false, pdfExport: false, indianLanguages: true  },
  pro:     { meetingMinutes: true,  actionItems: true,  pdfExport: true,  indianLanguages: true  },
  growth:  { meetingMinutes: true,  actionItems: true,  pdfExport: true,  indianLanguages: true  },
  team:    { meetingMinutes: true,  actionItems: true,  pdfExport: true,  indianLanguages: true  },
};
const defaultGates = PLAN_DEFAULTS;

const gateKeys = [
  { key: 'meetingMinutes',  label: 'Meeting Minutes' },
  { key: 'actionItems',     label: 'Action Items (Tasks)' },
  { key: 'pdfExport',       label: 'PDF Export' },
  { key: 'indianLanguages', label: 'Indian Languages' },
];

const editingGates = computed(() => allPlanData.value[activePlanEdit.value]?.gates ?? {});

// Cycle: null (default) → true (ON) → false (OFF) → null
function cycleGate(key) {
  const p = activePlanEdit.value;
  if (!allPlanData.value[p]) allPlanData.value[p] = {};
  if (!allPlanData.value[p].gates) allPlanData.value[p].gates = {};
  const cur = allPlanData.value[p].gates[key];
  if (cur === null || cur === undefined) allPlanData.value[p].gates[key] = true;
  else if (cur === true)  allPlanData.value[p].gates[key] = false;
  else                   allPlanData.value[p].gates[key] = null;
}

async function loadPlanFeatures() {
  plansLoading.value = true;
  try { allPlanData.value = await plansApi.getAll(); }
  catch { /* ignore */ }
  finally { plansLoading.value = false; }
}

async function savePlanFeatures() {
  plansSaving.value = true;
  plansSaveMsg.value = null;
  const p = activePlanEdit.value;
  try {
    const d = allPlanData.value[p] ?? {};
    await plansApi.update(p, d.features ?? [], d.monthlyPrice, d.annualMonthly, d.annualTotal, d.monthlyPaise, d.gates);
    plansSaveMsg.value = { ok: true, text: 'Saved!' };
  } catch (e) {
    plansSaveMsg.value = { ok: false, text: e.message || 'Save failed' };
  } finally {
    plansSaving.value = false;
    setTimeout(() => { plansSaveMsg.value = null; }, 3000);
  }
}

onMounted(() => {
  loadStats();
  loadActivity();
  loadUsers();
  loadRecordings();
  loadAnalytics();
  loadCosts();
  loadSubscriptions();
  loadCoupons();
  loadPlanFeatures();
});
</script>

<style scoped>
.drawer-enter-active, .drawer-leave-active { transition: opacity 0.25s ease; }

.drawer-enter-from, .drawer-leave-to { opacity: 0; }
</style>
