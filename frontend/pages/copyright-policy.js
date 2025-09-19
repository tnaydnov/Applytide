import Head from 'next/head';
import { useState } from 'react';

export default function CopyrightPolicy() {
  const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  return (
    <>
      <Head>
        <title>Copyright (DMCA) Policy - Applytide</title>
        <meta name="description" content="Applytide's Copyright and DMCA policy." />
        <meta name="robots" content="noindex" />
      </Head>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-invert max-w-none">
            <h1 className="text-3xl font-bold text-white mb-4">Copyright (DMCA) Policy</h1>
            <p className="text-slate-300">Last updated: {currentDate}</p>

            <p className="text-slate-300 my-4">
                Applytide respects the intellectual property rights of others and expects its users to do the same. 
                It is our policy, in appropriate circumstances and at our discretion, to disable and/or terminate the accounts of users who repeatedly infringe the copyrights of others.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. DMCA Notification of Claimed Infringement</h2>
            <p className="text-slate-300 mb-4">
                If you are a copyright owner and believe that any content on our service infringes upon your copyrights, you may submit a notification pursuant to the Digital Millennium Copyright Act ("DMCA") by providing our Copyright Agent with the following information in writing:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
                <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
                <li>Identification of the copyrighted work claimed to have been infringed.</li>
                <li>Identification of the material that is claimed to be infringing and where it is located on the Service.</li>
                <li>Information reasonably sufficient to permit the service provider to contact you, such as an address, telephone number, and, if available, an email address.</li>
                <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
                <li>A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Counter-Notice</h2>
            <p className="text-slate-300 mb-4">
                If you believe that your content that was removed is not infringing, or that you have the authorization from the copyright owner, you may send a counter-notice containing the following information to our Copyright Agent:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-300">
                <li>Your physical or electronic signature.</li>
                <li>Identification of the content that has been removed.</li>
                <li>A statement that you have a good faith belief that the content was removed as a result of mistake or a misidentification of the content.</li>
                <li>Your name, address, telephone number, and email address, and a statement that you consent to the jurisdiction of the federal court in your district.</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Designated Copyright Agent</h2>
            <p className="text-slate-300 mb-4">
                Our designated Copyright Agent to receive notifications of claimed infringement is:
            </p>
            <ul className="list-none space-y-2 text-slate-300">
                <li><strong>Copyright Agent:</strong> Applytide Developer</li>
                <li><strong>Email:</strong> <a href="mailto:copyright@applytide.com" className="text-blue-400 hover:text-blue-300">copyright@applytide.com</a></li>
                <li><strong>DMCA Contact:</strong> <a href="mailto:dmca@applytide.com" className="text-blue-400 hover:text-blue-300">dmca@applytide.com</a></li>
            </ul>
            <p className="text-slate-300 mt-4">
                <strong>Note:</strong> As an individual developer project, all DMCA notices should be sent to the email addresses above. We respond to all legitimate copyright concerns within 48 hours.
            </p>
            <p className="text-slate-300 mt-4">
                Please note that you may be liable for damages (including costs and attorneys' fees) if you materially misrepresent that a product or activity is infringing your copyrights.
            </p>

            <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Repeat Infringer Policy</h2>
            <p className="text-slate-300 mb-4">
                In accordance with the DMCA and other applicable law, we have adopted a policy of terminating, in appropriate circumstances, users who are deemed to be repeat infringers.
            </p>
        </div>
      </div>
    </>
  );
}