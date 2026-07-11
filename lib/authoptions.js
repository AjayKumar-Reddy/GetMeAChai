import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import User from "@/models/User"
import connectDB from "@/db/connectDb"
import bcrypt from "bcryptjs"

export const authOptions = {
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Please enter your email and password")
                }

                await connectDB()

                // Find user by email or username
                const user = await User.findOne({
                    $or: [
                        { email: credentials.email.toLowerCase() },
                        { username: credentials.email }
                    ]
                }).select("+password")

                if (!user) {
                    throw new Error("No user found with this email/username")
                }

                if (!user.password) {
                    throw new Error("This account is configured with GitHub login only")
                }

                const isPasswordMatch = await bcrypt.compare(credentials.password, user.password)
                if (!isPasswordMatch) {
                    throw new Error("Invalid password")
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.username, // NextAuth session user name mapping
                }
            }
        })
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account.provider === "github") {
                await connectDB()

                const currentUser = await User.findOne({ email: user.email })

                if (!currentUser) {
                    // Fix GitHub login loop by finding a unique username if collision occurs
                    let baseUsername = user.email.split("@")[0]
                    // Clean up username to only keep letters, numbers, and underscores
                    baseUsername = baseUsername.replace(/[^a-zA-Z0-9_]/g, "")
                    let username = baseUsername
                    let count = 1

                    while (await User.findOne({ username })) {
                        username = `${baseUsername}${count}`
                        count++
                    }

                    const newUser = new User({
                        email: user.email,
                        username: username,
                        name: user.name || username,
                        profilepic: user.image || "",
                    })
                    await newUser.save()
                }
                return true
            }
            return true // Allow other sign ins like credentials
        },

        async session({ session, token }) {
            await connectDB()
            if (session?.user?.email) {
                const dbUser = await User.findOne({ email: session.user.email })
                if (dbUser) {
                    session.user.name = dbUser.username
                }
            }
            return session
        },
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/login",
    }
}
