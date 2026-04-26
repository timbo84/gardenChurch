import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Youtube, Twitter } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col md:flex-row justify-between items-center gap-4 md:h-24">
        <div className="flex items-center gap-2">
          <Image src="logo.png" className="h-5 w-5" alt="icon" />
          <span className="text-sm font-medium">The Garden Church</span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="#" className="text-muted-foreground hover:text-foreground">
            <Facebook className="h-5 w-5" />
            <span className="sr-only">Facebook</span>
          </Link>
          <Link href="#" className="text-muted-foreground hover:text-foreground">
            <Instagram className="h-5 w-5" />
            <span className="sr-only">Instagram</span>
          </Link>
          <Link href="#" className="text-muted-foreground hover:text-foreground">
            <Youtube className="h-5 w-5" />
            <span className="sr-only">YouTube</span>
          </Link>
          <Link href="#" className="text-muted-foreground hover:text-foreground">
            <Twitter className="h-5 w-5" />
            <span className="sr-only">Twitter</span>
          </Link>
        </div>

        <div className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} The Garden Church. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
