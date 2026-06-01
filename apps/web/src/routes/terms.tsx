import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'

export const Route = createFileRoute('/terms')({
  component: TermsOfService,
})

function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4 font-satoshi">Terms of Service</h1>
          <p className="text-neutral-400 mb-12">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="space-y-8 text-neutral-300 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">1. Acceptance of Terms</h2>
              <p>
                By accessing and using RedCircle ("the Platform"), you accept and agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">2. Description of Service</h2>
              <p>
                RedCircle is a Web3 platform that tokenizes viral Reddit posts on the Solana blockchain.
                The Platform allows users to create, trade, and manage tokens representing Reddit content.
                Token launches are processed through Orynth (orynth.dev), our third-party infrastructure partner.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">3. Eligibility</h2>
              <p>
                You must be at least 18 years old to use this Platform. By using RedCircle, you represent and warrant that you meet this age requirement 
                and have the legal capacity to enter into these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">4. User Responsibilities</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">4.1 Account Security</h3>
                  <p>
                    You are responsible for maintaining the security of your Reddit account credentials and Solana wallet private keys. 
                    You agree to notify us immediately of any unauthorized access to your account.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">4.2 Compliance</h3>
                  <p>
                    You agree to comply with all applicable laws and regulations when using the Platform, including but not limited to 
                    securities laws, tax laws, and blockchain regulations.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">4.3 Prohibited Activities</h3>
                  <p>You agree not to:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                    <li>Use the Platform for any illegal or fraudulent purpose</li>
                    <li>Manipulate token prices or engage in market manipulation</li>
                    <li>Violate Reddit's Terms of Service</li>
                    <li>Attempt to gain unauthorized access to the Platform or other users' accounts</li>
                    <li>Interfere with or disrupt the Platform's functionality</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">5. Tokenization and Trading</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">5.1 Token Creation</h3>
                  <p>
                    Tokens created on the Platform represent engagement with Reddit posts and do not confer ownership, 
                    rights, or control over the underlying Reddit content.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">5.2 Trading Risks</h3>
                  <p>
                    Trading tokens involves significant risk, including the potential loss of your entire investment. 
                    Token values can be highly volatile and unpredictable. You acknowledge and accept these risks.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white mb-2">5.3 No Investment Advice</h3>
                  <p>
                    Nothing on the Platform constitutes investment, financial, legal, or tax advice. 
                    You should consult with appropriate professionals before making any trading decisions.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">6. Blockchain Transactions</h2>
              <p>
                All transactions on the Platform are conducted on the Solana blockchain and are irreversible. 
                Once a transaction is confirmed on the blockchain, it cannot be canceled or reversed by us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">7. Fees</h2>
              <p>
                The Platform charges the following fees, which are disclosed before you complete a transaction:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                <li><strong>Launch cost:</strong> covered by Redcircle — launching a token is free for users</li>
                <li><strong>Trading fee:</strong> 2.0% of each trade — 0.40% Meteora, 0.55% Orynth, 0.55% Redcircle, 0.50% to the post creator</li>
                <li><strong>Network fees:</strong> standard Solana transaction fees apply to all on-chain actions</li>
              </ul>
              <p className="mt-4">Fee amounts may change. The current quote is always shown before you confirm a launch.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">8. Intellectual Property</h2>
              <p>
                The Platform and its original content, features, and functionality are owned by RedCircle and are protected by 
                international copyright, trademark, and other intellectual property laws. Reddit content tokenized through the Platform 
                remains the property of its original creators and Reddit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">9. Disclaimers</h2>
              <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="font-semibold text-white mb-2">IMPORTANT:</p>
                <p>
                  THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. 
                  WE DO NOT GUARANTEE THAT THE PLATFORM WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. 
                  WE ARE NOT RESPONSIBLE FOR ANY LOSSES RESULTING FROM BLOCKCHAIN ISSUES, WALLET COMPROMISES, OR MARKET VOLATILITY.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">10. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, REDCIRCLE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, 
                OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">11. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless RedCircle, its affiliates, and their respective officers, directors, employees, and agents 
                from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Platform or 
                violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">12. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your access to the Platform at any time, with or without notice, 
                for any reason, including violation of these Terms. Upon termination, your right to use the Platform will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">13. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which RedCircle operates, 
                without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">14. Dispute Resolution</h2>
              <p>
                Any disputes arising from these Terms or your use of the Platform shall be resolved through binding arbitration, 
                except where prohibited by law. You waive any right to participate in a class action lawsuit or class-wide arbitration.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">15. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page 
                and updating the "Last updated" date. Your continued use of the Platform after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">16. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated 
                to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 font-satoshi">17. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 p-6 bg-white/5 rounded-lg border border-white/10">
                <p className="font-medium">Email: legal@redcircle.lol</p>
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
