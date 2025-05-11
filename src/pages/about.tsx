import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const features = [
  {
    title: 'Memorable and Secure Access Key',
    desc: 'Instead of a 12-24 word recovery phrase, you can use your private information or even information about a fictional person as your access key. This information is converted and managed by a special algorithm, so no one can restore your wallet from that information.',
  },
  {
    title: 'Privacy-First Design',
    desc: 'The information you enter is converted into a string that has no direct relation to the access key, making it impossible to trace back to the original information. Neither your information nor your key is stored on any server; everything is processed only on your device.',
  },
  {
    title: 'QR Code Integration',
    desc: 'The generated wallet access key can be output as a QR code, making it easy to import and use with other wallet apps.',
  },
  {
    title: 'Modern Web Technology',
    desc: 'Developed with the latest web technologies such as Next.js and TypeScript, combining security and usability.',
  },
];

const techAdvantages = [
  'Your input is securely converted into an access key using encryption and a unique algorithm',
  'One-way conversion ensures the access key cannot be reverse-engineered from your input',
  'Neither your information nor your key is stored on any server; you have complete control',
  'Easily link with other wallet apps via QR code',
  'Built with modern web technologies for security and convenience',
];

const AboutPage: React.FC = () => {
  const router = useRouter();
  return (
    <div
      className="min-h-screen flex items-center justify-center font-sans"
      style={{ background: 'radial-gradient(circle at center, #FFFFFF 0%, #EDEDED 100%)', height: '120%', padding: '20px 540px 100px 540px' }}
    >
      <Head>
        <title>About MVW</title>
        <meta name="description" content="Learn about MVW - A modern multi-chain wallet solution" />
      </Head>
      <main className="w-full max-w-4xl mx-auto px-4 py-12 md:py-20">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-12">
        <h1 style={{ fontSize: '6rem', marginBottom: '6px',height: '99px' }}>
        MVW
        </h1>
      <p
        style={{
          fontSize: '1.2rem',
          letterSpacing: '0.2em',
          marginBottom: '4.5rem',
        }}
      >
        MULTI VIEW WALLET
      </p>
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-3 text-center">Overview</h2>
            <p className="text-gray-700 text-center text-lg leading-relaxed">
              MVW adopts a new approach where, instead of a traditional 12-24 word recovery phrase, you can use your private information or even information about a fictional person as your wallet access key.<br />
              This information is securely converted and managed by a special algorithm, so no one can restore your wallet from that information.<br />
              The generated access key can be output as a QR code, making it easy to use with other wallet apps.<br />
              Neither your input nor the generated key is stored on any server; everything is processed only on your device.
            </p>
          </section>
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-6 text-center">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((f) => (
                <div key={f.title} className="bg-white/90 rounded-xl shadow-md p-6 flex flex-col items-start hover:shadow-xl transition-shadow">
                  <h3 className="text-xl font-bold mb-2 text-blue-700">{f.title}</h3>
                  <p className="text-gray-700">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-6 text-center">Technology</h2>
            <div className="bg-white/90 rounded-xl shadow-md p-6">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {techAdvantages.map((item) => (
                  <li key={item} className="flex items-center text-gray-700">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <div className="flex justify-center mt-8">
            <button
              onClick={() => router.back()}
              style={{
                padding: '0.6rem 2rem',
                background: '#000',
                color: '#fff',
                borderRadius: '999px',
                textDecoration: 'none',
                fontWeight: '500',
                border: 'none',
                marginTop: '90px',
              }}
            >
              Back
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutPage; 