import React from "react";

export const Donate = () => (
  <section className="border-4 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
    <h2 className="text-sm font-black uppercase tracking-widest mb-2 pb-1.5 border-b-2 border-black">
      🙏 投げ銭で応援
    </h2>
    <p className="text-sm leading-relaxed">
      このサービスを気に入っていただけたら、投げ銭で応援していただけると嬉しいです。
      <br />
      ご支援は開発継続や機能改善、そしてLLMのAPI代に活用させていただきます。
    </p>
    <div className="mt-4 flex flex-col sm:flex-row gap-2">
      <a
        href="https://ofuse.me/aba50879"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center rounded bg-[#25769B]! px-4 py-2 font-bold text-white shadow transition hover:bg-[#7db3ca]!"
      >
        Ofuse で支援
      </a>
      <a
        href="https://ko-fi.com/O4O41W5TTW"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center rounded border-2 border-black px-4 py-2 font-bold text-black shadow transition hover:bg-black hover:text-white"
      >
        Ko-fi で支援
      </a>
    </div>
  </section>
);
