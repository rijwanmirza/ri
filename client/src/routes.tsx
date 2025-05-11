import React from "react";
import { Route } from "wouter";
import Home from "@/pages/home";
import CampaignList from "@/pages/campaign-list";
import URLsPage from "@/pages/urls";
import URLsMobilePage from "@/pages/urls-mobile";
import GmailSettingsPage from "@/pages/gmail-settings";
import SystemSettingsPage from "@/pages/system-settings";
import TrafficstarPage from "@/pages/trafficstar";
import RedirectTest from "@/pages/redirect-test";
import TestSpentValuePage from "@/pages/test-spent-value";
import OriginalUrlRecordsPage from "@/pages/original-url-records-page";
import CampaignClickRecordsPage from "@/pages/campaign-click-records-page";
import CampaignClickDetailPage from "@/pages/campaign-click-detail-page";
import UrlClickRecordsPage from "@/pages/url-click-records-page";
import DetailedUrlRecordPage from "@/pages/detailed-url-record-page";
import UrlBudgetLogsPage from "@/pages/url-budget-logs";
import YoutubeUrlRecordsPage from "@/pages/youtube-url-records";
import YouTubeApiLogsPage from "@/pages/youtube-api-logs";
import BlacklistedUrlsPage from "@/pages/blacklisted-urls";
import ApiTesterPage from "@/pages/api-tester";
import NotFound from "@/pages/not-found";
import { useIsMobile } from "@/hooks/use-mobile";

export const getAppRoutes = () => {
  const isMobile = useIsMobile();
  
  return (
    <>
      <Route path="/">
        <Redirect to="/campaigns" />
      </Route>
      <Route path="/campaigns/:id">
        <Home />
      </Route>
      <Route path="/campaigns">
        <CampaignList />
      </Route>
      <Route path="/urls">
        {isMobile ? <URLsMobilePage /> : <URLsPage />}
      </Route>
      <Route path="/gmail-settings">
        <GmailSettingsPage />
      </Route>
      <Route path="/system-settings">
        <SystemSettingsPage />
      </Route>
      <Route path="/trafficstar">
        <TrafficstarPage />
      </Route>
      <Route path="/redirect-test">
        <RedirectTest />
      </Route>
      <Route path="/test-spent-value">
        <TestSpentValuePage />
      </Route>
      <Route path="/original-url-records">
        <OriginalUrlRecordsPage />
      </Route>
      <Route path="/campaign-click-records">
        <CampaignClickRecordsPage />
      </Route>
      <Route path="/campaign-click-detail/:id">
        <CampaignClickDetailPage />
      </Route>
      <Route path="/url-click-records">
        <UrlClickRecordsPage />
      </Route>
      <Route path="/detailed-url-record/:urlId">
        <DetailedUrlRecordPage />
      </Route>
      <Route path="/url-budget-logs">
        <UrlBudgetLogsPage />
      </Route>
      <Route path="/youtube-url-records">
        <YoutubeUrlRecordsPage />
      </Route>
      <Route path="/youtube-api-logs">
        <YouTubeApiLogsPage />
      </Route>
      <Route path="/blacklisted-urls">
        <BlacklistedUrlsPage />
      </Route>
      <Route path="/api-tester">
        <ApiTesterPage />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </>
  );
};

// Simple redirect component
const Redirect = ({ to }: { to: string }) => {
  React.useEffect(() => {
    window.location.href = to;
  }, [to]);
  
  return null;
};