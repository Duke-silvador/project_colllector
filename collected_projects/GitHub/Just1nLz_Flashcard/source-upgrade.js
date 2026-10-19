import {consolidateCards} from './duplicates.js';

// Exact records audited against the original Quizlet print PDF. These are source
// corrections, not heuristics for inferring answers in arbitrary imported files.
const auditedSourceUpgrades = [
  {
    "sourceNumber": 36,
    "term": "\"When Formal Systems Kill\" by Darren Abramson and others, what are the challenges to formal methods? Select ALL that apply. Computer code cannot be proven correct. How to mechanically check the correctness of mathematical proofs. How to automate methematical proofs. How to mathematically model formal systems and their environments.",
    "definition": "How to mechanically check the correctness of mathematical proofs. How to automate methematical proofs. How to mathematically model formal systems and their environments.",
    "replacement": {
      "term": "\"When Formal Systems Kill\" by Darren Abramson and others, what are the challenges to formal methods? Select all that apply.",
      "definition": "How to mechanically check the correctness of mathematical proofs.\nHow to automate methematical proofs.\nHow to mathematically model formal systems and their environments.",
      "type": "multi",
      "answers": [
        "How to mechanically check the correctness of mathematical proofs.",
        "How to automate methematical proofs.",
        "How to mathematically model formal systems and their environments."
      ],
      "options": [
        "Computer code cannot be proven correct.",
        "How to mechanically check the correctness of mathematical proofs.",
        "How to automate methematical proofs.",
        "How to mathematically model formal systems and their environments."
      ]
    }
  },
  {
    "sourceNumber": 42,
    "term": "\"Privacy and Ethical Concerns in Internet Security\" by Rebecca and James Rutherfoord, what does Durlak include in his list of basic rights regarding privacy? Select all that apply. intimacy solitude iron cage reserve",
    "definition": "intimacy solitude reserve",
    "replacement": {
      "term": "\"Privacy and Ethical Concerns in Internet Security\" by Rebecca and James Rutherfoord, what does Durlak include in his list of basic rights regarding privacy? Select all that apply.",
      "definition": "intimacy\nsolitude\nreserve",
      "type": "multi",
      "answers": [
        "intimacy",
        "solitude",
        "reserve"
      ],
      "options": [
        "intimacy",
        "solitude",
        "iron cage",
        "reserve"
      ]
    }
  },
  {
    "sourceNumber": 63,
    "term": "\"Choosing Passwords: Security and Human Factors\" by Edward Gehringer, which of the following does he suggest are the role of the computer scientist? Select all that apply. Reduce lockouts Modify the lifetime limits Make password management easier for the user Allow a user to have much longer passwords, of a universal format",
    "definition": "All",
    "replacement": {
      "term": "\"Choosing Passwords: Security and Human Factors\" by Edward Gehringer, which of the following does he suggest are the role of the computer scientist? Select all that apply.",
      "definition": "Reduce lockouts\nModify the lifetime limits\nMake password management easier for the user\nAllow a user to have much longer passwords, of a universal format",
      "type": "multi",
      "answers": [
        "Reduce lockouts",
        "Modify the lifetime limits",
        "Make password management easier for the user",
        "Allow a user to have much longer passwords, of a universal format"
      ],
      "options": [
        "Reduce lockouts",
        "Modify the lifetime limits",
        "Make password management easier for the user",
        "Allow a user to have much longer passwords, of a universal format"
      ]
    }
  },
  {
    "sourceNumber": 74,
    "term": "According to the paper regarding \"Ethic in Massively Multiplayer Online Role-Playing Games,\" what are the primary means by which playing games help guide moral development? Select all that apply. Defning good and bad behavior. Learning a system of rules. Practice following rules. Developing poor social skills",
    "definition": "Defning good and bad behavior. Learning a system of rules. Practice following rules.",
    "replacement": {
      "term": "According to the paper regarding \"Ethic in Massively Multiplayer Online Role-Playing Games,\" what are the primary means by which playing games help guide moral development? Select all that apply.",
      "definition": "Defning good and bad behavior.\nLearning a system of rules.\nPractice following rules.",
      "type": "multi",
      "answers": [
        "Defning good and bad behavior.",
        "Learning a system of rules.",
        "Practice following rules."
      ],
      "options": [
        "Defning good and bad behavior.",
        "Learning a system of rules.",
        "Practice following rules.",
        "Developing poor social skills"
      ]
    }
  },
  {
    "sourceNumber": 93,
    "term": "Which of the following research topics have the potential to expose real people to harm? Select all that apply. credit card fraud spam viruses botnet",
    "definition": "all",
    "replacement": {
      "term": "Which of the following research topics have the potential to expose real people to harm? Select all that apply.",
      "definition": "credit card fraud\nspam\nviruses\nbotnet",
      "type": "multi",
      "answers": [
        "credit card fraud",
        "spam",
        "viruses",
        "botnet"
      ],
      "options": [
        "credit card fraud",
        "spam",
        "viruses",
        "botnet"
      ]
    }
  },
  {
    "sourceNumber": 15,
    "term": "\"Automated Detect and Avoid\" by Erik Theunissen and others, which of the following statements is the most correct? Current data supports the claim that self-driving cars have resulted in a reduction in the number of accidents. When it comes to programming automated detect and avoid algorithms, human values and judgments do not become part of the code. Current data does not support the claim that self-driving cars have resulted in a reduction in the number of accidents. When it comes to programming automated detect and avoid algorithms, it is best to replace all human judgment with algorithms as algorithms can be perfected to respond correctly in all situations",
    "definition": "Current data does not support the claim that self-driving cars have resulted in a reduction in the number of accidents.q",
    "replacement": {
      "term": "\"Automated Detect and Avoid\" by Erik Theunissen and others, which of the following statements is the most correct? Current data supports the claim that self-driving cars have resulted in a reduction in the number of accidents. When it comes to programming automated detect and avoid algorithms, human values and judgments do not become part of the code. Current data does not support the claim that self-driving cars have resulted in a reduction in the number of accidents. When it comes to programming automated detect and avoid algorithms, it is best to replace all human judgment with algorithms as algorithms can be perfected to respond correctly in all situations",
      "definition": "Current data does not support the claim that self-driving cars have resulted in a reduction in the number of accidents."
    }
  }
];

/** Preserve audited answer boundaries, then consolidate duplicate questions. */
export function prepareStudyCards(inputCards) {
  const sourceUpgrades = [];
  const prepared = inputCards.map(card => {
    if (!card || card.type === 'multi') return card;
    const audited = auditedSourceUpgrades.find(spec => card.term === spec.term && card.definition === spec.definition);
    if (!audited) return card;
    sourceUpgrades.push(audited.sourceNumber);
    const replacement = {...audited.replacement};
    if (replacement.answers) replacement.answers = [...replacement.answers];
    if (replacement.options) replacement.options = [...replacement.options];
    return replacement;
  });
  const plan = consolidateCards(prepared);
  return {...plan, changed:plan.changed || sourceUpgrades.length > 0,
    upgradedCount:sourceUpgrades.length, sourceUpgrades};
}
