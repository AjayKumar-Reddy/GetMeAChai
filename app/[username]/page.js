
import React from 'react'
import PaymentPage from '@/components/PaymentPage';
import { notFound } from 'next/navigation';
import connectDB from '@/db/connectDb';
import User from '@/models/User';

const Username = async ({ params }) => {
    // In Next.js 15, params is a Promise — must be awaited
    const { username } = await params

    await connectDB()
    let user = await User.findOne({ username: username })
    if (!user) {
        return notFound()
    }

    return (
        <>
            <PaymentPage username={username} />
        </>
    )
}

export default Username

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
    const { username } = await params
    return {
        title: `Support ${username} - Fund their projects`,
        description: `Support ${username} by funding their projects. A crowdfunding platform for creators. Get funded by your fans and followers. Start now!`,
    }
}
