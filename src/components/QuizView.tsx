
"use client";

import type { QuizData } from "@/ai/flows/generate-quiz-flow";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle } from "lucide-react";

interface QuizViewProps {
  quizData: QuizData;
  summaryContent: string;
}

export function QuizView({ quizData, summaryContent }: QuizViewProps) {
  const { toast } = useToast();
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleAnswerChange = (questionId: string, answerId: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setShowResults(false);
    setQuizScore(null);
  };

  const handleCheckAnswers = () => {
    let score = 0;
    quizData.questions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswerId) {
        score++;
      }
    });
    setQuizScore(score);
    setShowResults(true);
    toast({ title: "Résultat du QCM", description: `Vous avez obtenu ${score} sur ${quizData.questions.length} bonnes réponses.` });
  };

  const resetQuiz = () => {
    setUserAnswers({});
    setQuizScore(null);
    setShowResults(false);
  };
  
  return (
    <div id="qcm-container">
       <div className="bg-muted p-4 rounded-lg mb-6 max-h-[200px] overflow-y-auto prose prose-sm sm:prose max-w-none scroll-hover" dangerouslySetInnerHTML={{ __html: summaryContent }} />

        <div id="qcm-questions-container">
            {quizData.questions.map((question, qIndex) => (
            <div key={question.id} className="qcm-question-block mb-6 p-4 border border-border rounded-lg bg-background">
                <p className="font-semibold mb-3 text-lg">{qIndex + 1}. {question.questionText}</p>
                <RadioGroup
                value={userAnswers[question.id] || ""}
                onValueChange={(value) => handleAnswerChange(question.id, value)}
                aria-label={`Options pour la question ${qIndex + 1}`}
                >
                {question.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} disabled={showResults} />
                    <Label htmlFor={`${question.id}-${option.id}`} className={cn("cursor-pointer", showResults && userAnswers[question.id] === option.id && (option.id === question.correctAnswerId ? "text-green-600 dark:text-green-400 font-bold" : "text-red-600 dark:text-red-400 font-bold"), showResults && option.id === question.correctAnswerId && "text-green-600 dark:text-green-400")}>
                        {option.text}
                        {showResults && userAnswers[question.id] === option.id && (option.id === question.correctAnswerId ? <CheckCircle className="inline-block ml-2 h-5 w-5 text-green-500" /> : <XCircle className="inline-block ml-2 h-5 w-5 text-red-500" />)}
                        {showResults && option.id === question.correctAnswerId && userAnswers[question.id] !== option.id && <CheckCircle className="inline-block ml-2 h-5 w-5 text-green-500" />}
                    </Label>
                    </div>
                ))}
                </RadioGroup>
                {showResults && question.explanation && (
                    <p className={cn("mt-2 text-sm p-2 rounded-md", userAnswers[question.id] === question.correctAnswerId ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300")}>
                    <strong>Explication :</strong> {question.explanation}
                </p>
                )}
                {showResults && !question.explanation && userAnswers[question.id] !== question.correctAnswerId && (
                    <p className="mt-2 text-sm p-2 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                    <strong>Note :</strong> La bonne réponse était <span className="font-bold">{quizData.questions.find(q => q.id === question.id)?.options.find(opt => opt.id === question.correctAnswerId)?.text || 'N/A'}</span>.
                </p>
                )}
            </div>
            ))}
        </div>

        {quizScore !== null && showResults && (
            <div className="mt-6 p-4 border-2 border-primary rounded-lg text-center bg-primary/10">
            <h4 className="text-xl font-bold font-headline mb-2 text-primary">Votre Score : {quizScore} / {quizData.questions.length}</h4>
            </div>
        )}

        {!showResults && (
            <Button
            onClick={handleCheckAnswers}
            className="w-full mt-4 action-btn bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transition-all duration-300 ease-in-out"
            disabled={Object.keys(userAnswers).length !== quizData.questions.length}>
            Vérifier mes réponses
            </Button>
        )}
        {showResults && (
            <Button
            onClick={resetQuiz}
            className="w-full mt-4 action-btn bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 text-white transition-all duration-300 ease-in-out">
            Rejouer le Quiz
            </Button>
        )}
    </div>
  );
}
