import { Navigate, createBrowserRouter } from "react-router-dom";

import { App, RouteErrorBoundary } from "./App";
import { AdminUsersPage, adminUsersLoader } from "./features/admin";
import {
  LoginPage,
  ResetPinPage,
  SignupPage,
  loginAction,
  rootLoader,
  signupAction
} from "./features/auth";
import {
  CaptureLayout,
  CaptureOverviewPage,
  CaptureReviewPage,
  CaptureSubmissionDetailPage,
  CaptureSubmissionsPage,
  captureJobDetailAction,
  captureJobDetailLoader,
  captureJobsLoader,
  ImageCapturePage,
  InterviewCapturePage,
  VoiceCapturePage,
  captureLoader,
  imageAction,
  resetCaptureAction,
  submitCaptureAction,
  voiceAction
} from "./features/capture";
import { BusanDashboardPage, DashboardPage } from "./features/dashboard";
import { PersonaPage, personaLoader, sejongPersonaLoader } from "./features/persona";
import { TeamFitPage, teamFitLoader } from "./features/teamfit";
import { VerificationPage } from "./features/verification";
import { AdminVerificationsPage } from "./features/admin";

export const router = createBrowserRouter([
  {
    id: "root",
    path: "/",
    element: <App />,
    loader: rootLoader,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <PersonaPage pageMode="pr" />,
        loader: sejongPersonaLoader
      },
      {
        path: "home",
        element: <Navigate to="/" replace />
      },
      {
        id: "capture",
        path: "capture",
        element: <CaptureLayout />,
        loader: captureLoader,
        children: [
          {
            index: true,
            element: <CaptureOverviewPage />
          },
          {
            path: "submissions",
            element: <CaptureSubmissionsPage />,
            loader: captureJobsLoader
          },
          {
            path: "submissions/:jobId",
            element: <CaptureSubmissionDetailPage />,
            loader: captureJobDetailLoader,
            action: captureJobDetailAction
          },
          {
            path: "interview",
            element: <InterviewCapturePage />
          },
          {
            path: "voice",
            element: <VoiceCapturePage />,
            action: voiceAction
          },
          {
            path: "image",
            element: <ImageCapturePage />,
            action: imageAction
          },
          {
            path: "review",
            element: <CaptureReviewPage />,
            action: submitCaptureAction
          },
          {
            path: "reset",
            action: resetCaptureAction
          }
        ]
      },
      {
        path: "auth/signup",
        element: <SignupPage />,
        action: signupAction
      },
      {
        path: "auth/login",
        element: <LoginPage />,
        action: loginAction
      },
      {
        path: "auth/reset-pin",
        element: <ResetPinPage />
      },
      {
        path: "admin/users",
        element: <AdminUsersPage />,
        loader: adminUsersLoader
      },
      {
        path: "admin/verifications",
        element: <AdminVerificationsPage />
      },
      {
        path: "verification",
        element: <VerificationPage />
      },
      {
        path: "dashboard",
        element: <Navigate to="/seoul/dashboard" replace />
      },
      {
        path: "seoul/dashboard",
        element: <DashboardPage />
      },
      {
        path: "busan/dashboard",
        element: <BusanDashboardPage />
      },
      {
        path: "persona/sejong",
        element: <Navigate to="/" replace />
      },
      {
        path: "persona/:personId",
        element: <PersonaPage pageMode="pr" />,
        loader: personaLoader
      },
      {
        path: "ai/:personId",
        element: <PersonaPage pageMode="chat" />,
        loader: personaLoader
      },
      {
        path: "team-fit",
        element: <TeamFitPage />,
        loader: teamFitLoader
      }
    ]
  }
]);
