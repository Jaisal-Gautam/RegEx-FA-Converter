import { compileRegexWithSteps } from './src/utils/thompson.js';
const { nfa, constructionSteps } = compileRegexWithSteps('a*.b*');
const lastStep = constructionSteps[constructionSteps.length - 1];
const states = lastStep.resultSnapshot.states;
const transitions = lastStep.resultSnapshot.transitions;
console.log(transitions);
