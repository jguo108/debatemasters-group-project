"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/MaterialIcon";
import { ensureUserProfileInitialized } from "@/lib/data/profile-storage";

export default function RegisterPage() {
  function handleJoinArena() {
    ensureUserProfileInitialized();
  }

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-stone-950 font-headline-pixel">
      <div className="fixed inset-0 z-0">
        <img
          alt=""
          className="h-full w-full object-cover opacity-60 mix-blend-multiply"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWHLIPMZk8okq_po_SU4tMFq12VjPTr0EadH_CRZVrG9N1eCak5kxqdcigekqODLvAXoh1LbQGimrSekl5QdCEQDFMWg79i4oWsEFmJ8Cqv0VnHK0XBUVsYE69cHHvpelWbRuCM4nsmY9RZo-Um7ePia408GTIiekT0IHzot8lwacbrAicZLXe_Za_5QLIOIVW3e0OmUmeikZVb0CnWTsJSn6WcDUKNmSzjXJ5rn8EplUxWueFWu4uJihdB3Wpkz3lQGrkuJt0lbyl"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-red-900/40 via-transparent to-stone-950/80" />
        <div className="absolute bottom-0 h-1/3 w-full bg-gradient-to-t from-orange-600/20 to-transparent" />
      </div>
      <main className="relative z-10 flex w-full max-w-4xl flex-col items-center p-8">
        <div className="voxel-shadow relative w-full max-w-lg overflow-hidden border-[6px] border-stone-950 bg-stone-900">
          <div className="flex h-16 w-full items-center justify-between border-b-[6px] border-stone-950 bg-stone-800 px-6">
            <div className="flex items-center gap-3">
              <MaterialIcon name="person_add" className="text-orange-500" filled />
              <span className="brick-sans pixel-text-base font-bold uppercase tracking-tight text-stone-200">
                Create Player ID
              </span>
            </div>
            <div className="flex gap-1">
              <div className="h-3 w-3 bg-red-600" />
              <div className="h-3 w-3 bg-orange-500" />
            </div>
          </div>
          <div
            className="space-y-8 bg-stone-900 p-8"
            style={{
              backgroundImage:
                "url('https://www.transparenttextures.com/patterns/dark-matter.png')",
            }}
          >
            <div className="flex items-start gap-6">
              <div className="group relative h-32 w-32 flex-shrink-0 border-4 border-stone-950 bg-stone-800">
                <img
                  alt=""
                  className="h-full w-full object-cover brightness-75 grayscale transition-all duration-300 group-hover:grayscale-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVfPS3hsP2JvHRRSsT7al78H2KUNFNurf_r4nUcNb3LLVqJ47BbQqjlqDNXC_PLWgohjrgTx5ewjb3KJVWE6D3hg1aRUB3z7NueZDYows-sYdS2Rzeqa2mqS_QegQtVW9csYfLIJUfsBr_zkRkpcJFxD8Wr5XDuAmN5ru4BSrCrmoBZgN61NAJCr5_LS9pc7sDmET_SUokKiolCDsgOI89UXxKczjifWfsauJW3bxqNbQOD4PPi6etpiaRk7hn-zeBQ0zniHWR2D_2"
                />
                <div className="pointer-events-none absolute inset-0 border-2 border-white/5" />
                <div className="absolute -bottom-2 -right-2 bg-green-500 p-1 text-stone-950">
                  <MaterialIcon name="add_a_photo" className="block text-sm" />
                </div>
              </div>
              <div className="flex-grow space-y-4">
                <div className="space-y-2">
                  <label className="pixel-text-xs block font-bold uppercase tracking-widest text-orange-500">
                    Player Name
                  </label>
                  <div className="relative">
                    <input
                      className="brick-sans voxel-inset w-full border-none bg-stone-950 py-3 px-4 pixel-text-sm font-bold uppercase text-white placeholder:text-stone-700 focus:ring-4 focus:ring-green-500/30"
                      placeholder="NEW_USERNAME"
                      type="text"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="pixel-text-xs block font-bold uppercase tracking-widest text-orange-500">
                    Secret Seed
                  </label>
                  <div className="relative">
                    <input
                      className="brick-sans voxel-inset w-full border-none bg-stone-950 py-3 px-4 pixel-text-sm font-bold text-white placeholder:text-stone-700 focus:ring-4 focus:ring-green-500/30"
                      placeholder="••••••••"
                      type="password"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Link
                href="/onboarding"
                onClick={handleJoinArena}
                className="brick-sans block w-full text-center voxel-shadow-small border-t-4 border-green-400 bg-green-600 py-4 pixel-text-base font-black uppercase tracking-tighter text-stone-950 transition-all duration-75 hover:bg-green-500 active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                JOIN ARENA
              </Link>
              <div className="flex items-center justify-between px-1">
                <span className="pixel-text-xs font-bold uppercase tracking-widest text-stone-600">
                  Already spawned?
                </span>
                <div className="mx-4 h-[2px] flex-grow bg-stone-800" />
                <Link
                  href="/login"
                  className="pixel-text-xs font-bold uppercase tracking-widest text-orange-500 transition-colors hover:text-orange-400"
                >
                  Log In
                </Link>
              </div>
            </div>
          </div>
          <div className="flex h-3 w-full overflow-hidden bg-stone-950">
            <div className="h-full w-1/4 bg-green-900" />
            <div className="h-full w-1/4 bg-green-700" />
            <div className="h-full w-1/4 bg-green-500" />
            <div className="h-full w-1/4 bg-green-300" />
          </div>
        </div>
      </main>
      <div className="pointer-events-none fixed inset-0 z-20 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)]" />
    </div>
  );
}
