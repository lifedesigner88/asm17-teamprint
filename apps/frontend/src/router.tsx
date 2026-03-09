import { createBrowserRouter } from "react-router-dom";

import {
  AdminUsersPage,
  App,
  HomePage,
  LoginPage,
  RouteErrorBoundary,
  SignupPage,
  adminUsersLoader,
  homeAction,
  homeLoader,
  loginAction,
  rootLoader,
  signupAction
} from "./App";
import {
  CaptureLayout,
  CaptureOverviewPage,
  CaptureReviewPage,
  ImageCapturePage,
  InterviewCapturePage,
  VoiceCapturePage,
  captureLoader,
  imageAction,
  interviewAction,
  resetCaptureAction,
  voiceAction,
} from "./features/capture";

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
        element: <HomePage />,
        loader: homeLoader,
        action: homeAction
      },
      {
        id: "capture",
        path: "capture",
        element: <CaptureLayout />,
        loader: captureLoader,
        children: [
          {
            index: true,
            element: <CaptureOverviewPage />,
          },
          {
            path: "interview",
            element: <InterviewCapturePage />,
            action: interviewAction,
          },
          {
            path: "voice",
            element: <VoiceCapturePage />,
            action: voiceAction,
          },
          {
            path: "image",
            element: <ImageCapturePage />,
            action: imageAction,
          },
          {
            path: "review",
            element: <CaptureReviewPage />,
          },
          {
            path: "reset",
            action: resetCaptureAction,
          },
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
        path: "admin/users",
        element: <AdminUsersPage />,
        loader: adminUsersLoader
      }
    ]
  }
]);
