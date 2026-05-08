import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      username: string
      image?: string | null
      isPremium: boolean
      isPro: boolean
      isEmailVerified: boolean
    }
  }
}
