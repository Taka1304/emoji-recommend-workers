const WORDS = [
	"*Don’t let your dreams be dreams*\n（夢を夢のまま終わらせるな）",
	"*Yesterday you said tomorrow*\n（昨日は「明日やる」って言ったよな）",
	"*Make your dreams come true!*\n（夢を叶えろ!）",
	"*Nothing is impossible!*\n（不可能なんてない）",
	"*Where anyone else would quit and you’re not going to stop there*\n（他の人は諦めるところで、お前はそこで止まらない）",
	"*No, what are you waiting for?* \n（何を待っているんだ？）\n\n *Just do it!!!* （とにかくやれ!!!）",
	"*If you’re tired of starting over*\n（もしやり直すのが嫌なら）\n*Stop giving up*\n（諦めることをやめるんだ）",
];

export const randomWord = () => {
	return WORDS[Math.floor(Math.random() * WORDS.length)];
};

export const summonOjisan =
	":justdoit_1::justdoit_2:\n:justdoit_3::justdoit_4:\n";
