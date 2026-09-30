import { Product } from "@/db/products";
import { FlatList, StyleSheet } from "react-native";
import EmptyState from "./EmptyState";
import ProductCard from "./ProductCard";

type Props = {
    products: Product[];
    onEdit: (p: Product) => void;
    onDelete: (id: number) => void;
};

export default function ProductList({ products, onEdit, onDelete }: Props) {
    return (
        <FlatList
            data={products}
            keyExtractor={(item) => String(item.id ?? item.name)}
            renderItem={({ item }) => (
                <ProductCard product={item} onEdit={onEdit} onDelete={onDelete} />
            )}
            ListEmptyComponent={<EmptyState />}
            contentContainerStyle={
                products.length === 0 ? styles.emptyWrap : styles.listWrap
            }
            showsVerticalScrollIndicator={false}
        />
    );
}

const styles = StyleSheet.create({
    listWrap: { paddingBottom: 100, paddingTop: 8 },
    emptyWrap: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
});