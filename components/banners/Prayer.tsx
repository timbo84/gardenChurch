import { Trees } from "lucide-react"

export function Prayer() {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 py-8 rounded-2xl border-t-2 border-b-2 border-[#9F7A49] shadow-md bg-gradient-to-r from-[#CBAF8B] to-[#A07C54] relative mb-10">
      <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
        <Trees className="absolute top-4 left-6 h-10 w-10 text-[#7A5C3A]" />
        <Trees className="absolute bottom-6 right-8 h-8 w-8 text-[#7A5C3A]" />
      </div>
      <div className="relative z-10 text-center">
        <h2 className="text-4xl font-serif font-semibold tracking-wide text-white drop-shadow-md">
         Prayer Requests
        </h2>
        <p className="mt-2 text-sm text-[#FFFBEA] italic">
          James 5:16
        </p>
      </div>
    </div>
  )
}