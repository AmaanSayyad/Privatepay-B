import { useEffect, useState } from "react";
import { useAppWallet } from "../hooks/useAppWallet.js";
import { getPointsConfig, getPointsLeaderboard, getUserPoints, getPointsHistory } from "../lib/supabase.js";
import { Button, Card, CardBody, Spinner, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from "@nextui-org/react";
import { useNavigate } from "react-router-dom";

export default function PointsPage() {
  const { account, connect } = useAppWallet();
  const [points, setPoints] = useState({ totalPoints: 0, lifetimePoints: 0, level: 1 });
  const [pointsHistory, setPointsHistory] = useState([]);
  const [pointsConfig, setPointsConfig] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const navigate = useNavigate();

  const loadPoints = async () => {
    if (!account) return;
    setIsLoading(true);
    try {
      const data = await getUserPoints(account);
      setPoints({ totalPoints: data.totalPoints ?? 0, lifetimePoints: data.lifetimePoints ?? 0, level: data.level ?? 1 });
      const history = await getPointsHistory(account, 50);
      setPointsHistory(history || []);
    } catch (error) {
      console.error("Error loading points:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPointsConfig = async () => {
    try {
      const config = await getPointsConfig();
      setPointsConfig(config || []);
    } catch (error) {
      console.error("Error loading points config:", error);
    }
  };

  const loadLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const data = await getPointsLeaderboard(100);
      setLeaderboard(data || []);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (account) {
      loadPoints();
    } else {
      setIsLoading(false);
    }
    loadPointsConfig();
    loadLeaderboard();
  }, [account]);

  useEffect(() => {
    const onUpdate = () => {
      if (account) loadPoints();
    };
    window.addEventListener("points-updated", onUpdate);
    return () => window.removeEventListener("points-updated", onUpdate);
  }, [account]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const ACTION_LABELS = {
    first_payment: "First payment",
    first_received: "First received",
    payment_link_created: "Payment link created",
    payment_sent: "Payment sent",
    payment_received: "Payment received",
    payment_withdrawn: "Withdrawal",
    daily_login: "Daily login",
    referral_signup: "Referral signup",
  };
  const getActionLabel = (tx) => {
    const type = tx.transaction_type ?? tx.transactionType ?? "";
    return ACTION_LABELS[type] || type.replace(/_/g, " ") || "Points earned";
  };
  const getPointsValue = (tx) => {
    const v = tx.points ?? tx.points_value;
    return typeof v === "number" ? v : Number(v) || 0;
  };

  const shortenAddress = (addr) => {
    if (!addr || typeof addr !== "string") return "—";
    const s = addr.trim();
    if (s.length < 12) return s;
    return `${s.slice(0, 6)}...${s.slice(-4)}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-24 pb-24 flex flex-col gap-6">
      <div className="flex items-center justify-between sticky top-20 z-40 bg-light-white/95 backdrop-blur-sm py-4 -mx-4 px-4 rounded-lg">
        <h1 className="text-2xl font-bold text-gray-900">Points & Rewards</h1>
        <Button onClick={() => navigate("/")} className="bg-primary text-white">
          Back to Dashboard
        </Button>
      </div>

      {/* Connect wallet prompt when not connected */}
      {!account && (
        <Card className="rounded-3xl border-2 border-dashed border-primary/40 bg-primary-50/50 shadow-lg">
          <CardBody className="p-8 text-center">
            <p className="text-gray-700 font-medium mb-2">Connect your wallet to view your points</p>
            <p className="text-sm text-gray-500 mb-4">Points are tied to your wallet. Connect the same wallet you use for payments to see your balance and history.</p>
            <div className="flex justify-center">
              <Button onClick={() => connect()} className="bg-primary hover:bg-primary-800 text-white font-bold h-12 rounded-2xl px-6">
                Connect Wallet
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Points Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-3xl border border-gray-200 shadow-lg">
          <CardBody className="p-6">
            <p className="text-sm text-gray-600 mb-2">Total Points</p>
            <p className="text-3xl font-bold text-primary">{points.totalPoints.toLocaleString()}</p>
          </CardBody>
        </Card>
        <Card className="rounded-3xl border border-gray-200 shadow-lg">
          <CardBody className="p-6">
            <p className="text-sm text-gray-600 mb-2">Lifetime Points</p>
            <p className="text-3xl font-bold text-amber-600">{points.lifetimePoints.toLocaleString()}</p>
          </CardBody>
        </Card>
        <Card className="rounded-3xl border border-gray-200 shadow-lg">
          <CardBody className="p-6">
            <p className="text-sm text-gray-600 mb-2">Current Level</p>
            <p className="text-3xl font-bold text-green-600">Level {points.level}</p>
          </CardBody>
        </Card>
      </div>

      {/* Points History */}
      <Card className="rounded-3xl border border-gray-200 shadow-lg">
        <CardBody className="p-6">
          <h2 className="text-xl font-semibold mb-4">Points History</h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner color="primary" />
            </div>
          ) : pointsHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No points history yet. Send or receive ETH/USDC and create payment links to earn points.</p>
          ) : (
            <Table aria-label="Points history" classNames={{ wrapper: "rounded-2xl" }}>
              <TableHeader>
                <TableColumn>Date</TableColumn>
                <TableColumn>Action</TableColumn>
                <TableColumn>Points</TableColumn>
                <TableColumn>Description</TableColumn>
              </TableHeader>
              <TableBody>
                {pointsHistory.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{formatDate(tx.created_at ?? tx.createdAt)}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color="primary" className="font-medium">
                        <span>{getActionLabel(tx)}</span>
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">+{getPointsValue(tx)}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{tx.description || "Points earned"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* How to Earn */}
      <Card className="rounded-3xl border border-gray-200 shadow-lg">
        <CardBody className="p-6">
          <h2 className="text-xl font-semibold mb-4">How to Earn Points</h2>
          {pointsConfig.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Loading...</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pointsConfig.map((config) => {
                const ACTION_LABELS = {
                  first_payment: 'Bonus points for your first payment sent',
                  first_received: 'Bonus points for your first payment received',
                  payment_link_created: 'Points awarded for creating a new payment link',
                  payment_sent: 'Points awarded for every ETH payment sent',
                  payment_received: 'Points awarded for every payment received',
                };
                const ACTION_SUBTITLES = {
                  first_payment: 'First Payment',
                  first_received: 'First Received',
                  payment_link_created: 'Payment Link Created',
                  payment_sent: 'Payment Sent',
                  payment_received: 'Payment Received',
                };
                const label = ACTION_LABELS[config.action_type] || config.action_type?.replace(/_/g, ' ');
                const subtitle = ACTION_SUBTITLES[config.action_type] || config.action_type?.replace(/_/g, ' ');
                return (
                  <div
                    key={config.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-primary capitalize">{subtitle}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-primary">+{config.points_value}</p>
                      <p className="text-xs text-gray-600">points</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Leaderboard */}
      <Card className="rounded-3xl border border-gray-200 shadow-lg">
        <CardBody className="p-6">
          <h2 className="text-xl font-semibold mb-4">Top Users</h2>
          <p className="text-sm text-gray-600 mb-4">Ranked by lifetime points</p>
          {isLoadingLeaderboard ? (
            <div className="flex justify-center py-8">
              <Spinner color="primary" />
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No leaderboard data yet.</p>
          ) : (
            <Table aria-label="Leaderboard" classNames={{ wrapper: "rounded-2xl" }}>
              <TableHeader>
                <TableColumn>Rank</TableColumn>
                <TableColumn>Wallet</TableColumn>
                <TableColumn>Level</TableColumn>
                <TableColumn>Lifetime Points</TableColumn>
              </TableHeader>
              <TableBody>
                {leaderboard.map((user, index) => (
                  <TableRow key={user.wallet_address || user.walletAddress || user.id || index}>
                    <TableCell>
                      <span className="font-bold text-lg">#{index + 1}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{shortenAddress(user.wallet_address || user.walletAddress)}</span>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color="success">
                        Level {user.level}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-amber-600">{user.lifetime_points?.toLocaleString()}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
