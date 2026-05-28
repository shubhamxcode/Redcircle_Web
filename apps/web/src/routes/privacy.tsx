import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicy,
})

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4 font-satoshi">Privacy Policy</h1>
          <p className="text-neutral-400 mb-12">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="space-y-8 text-neutral-300 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">1. Introduction</h2>
              <p>
                Welcome to RedCircle ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">2. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">2.1 Information from Reddit</h3>
                  <p>
                    When you connect your Reddit account, we collect your Reddit username, user ID, and profile information. 
                    This is necessary to tokenize Reddit posts and facilitate trading on the Solana blockchain.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">2.2 Blockchain Data</h3>
                  <p>
                    We collect your Solana wallet address and transaction history related to token trading on our platform. 
                    All blockchain transactions are publicly visible on the Solana network.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">2.3 Usage Data</h3>
                  <p>
                    We automatically collect certain information when you visit, use, or navigate our platform. 
                    This includes information such as your device type, browser type, IP address, and usage patterns.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li>Facilitate Reddit post tokenization and token trading</li>
                <li>Process transactions on the Solana blockchain</li>
                <li>Maintain and improve our platform</li>
                <li>Communicate with you about your account and transactions</li>
                <li>Detect and prevent fraud and abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">4. Information Sharing</h2>
              <p>
                We do not sell your personal information. We may share your information with:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li><strong>Reddit:</strong> When you authorize us to access your Reddit account</li>
                <li><strong>Blockchain Networks:</strong> Transaction data is publicly recorded on the Solana blockchain</li>
                <li><strong>Orynth:</strong> Our token launch infrastructure partner (orynth.dev), which processes all Solana token launches and receives transaction data required to execute on-chain</li>
                <li><strong>Service Providers:</strong> Other third-party services that help us operate our platform</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational security measures to protect your personal information. 
                However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">6. Your Rights</h2>
              <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li>The right to access your personal information</li>
                <li>The right to correct inaccurate information</li>
                <li>The right to delete your information</li>
                <li>The right to restrict processing</li>
                <li>The right to data portability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">7. Cookies and Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to track activity on our platform and store certain information. 
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">8. Third-Party Links</h2>
              <p>
                Our platform may contain links to third-party websites, including Reddit and blockchain explorers. 
                We are not responsible for the privacy practices of these third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">9. Children's Privacy</h2>
              <p>
                Our platform is not intended for users under the age of 18. We do not knowingly collect personal information from children under 18. 
                If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page 
                and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">11. Contact Us</h2>
              <p>
                If you have questions or comments about this Privacy Policy, please contact us at:
              </p>
              <div className="mt-4 p-6 bg-white/5 rounded-lg border border-white/10">
                <p className="font-medium">Email: privacy@redcircle.lol</p>
                <p className="mt-2">GitHub: <a href="https://github.com/redcircle-lol" className="text-blue-400 hover:underline">@redcircle-lol</a></p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <a href="/home" className="text-blue-400 hover:underline">← Back to Home</a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}


